import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const createTicketSchema = z.object({
  category: z.string().min(1),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL']),
  subject: z.string().min(5).max(200),
  description: z.string().min(20).max(5000),
  userId: z.string().optional(),
  guestName: z.string().optional(),
  guestEmail: z.string().email().optional()
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const validatedData = createTicketSchema.parse(body);

    // For guest users, require name and email
    if (!session && (!validatedData.guestName || !validatedData.guestEmail)) {
      return NextResponse.json({ 
        error: 'Guest users must provide name and email' 
      }, { status: 400 });
    }

    // For authenticated users, verify they can only create tickets for themselves
    if (session && validatedData.userId && session.user.id !== validatedData.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Generate unique ticket number
    const ticketNumber = await generateTicketNumber();

    // Determine SLA deadline based on category and priority
    const slaHours = getSLAHours(validatedData.category, validatedData.priority);
    const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000);

    // Create support ticket
    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber,
        userId: session?.user?.id || null,
        guestEmail: validatedData.guestEmail || null,
        category: validatedData.category,
        priority: validatedData.priority,
        subject: validatedData.subject,
        description: validatedData.description,
        slaDeadline,
        metadata: {
          createdVia: 'web',
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent'),
          guestName: validatedData.guestName
        }
      }
    });

    // Create initial message
    await prisma.supportMessage.create({
      data: {
        ticketId: ticket.id,
        senderId: session?.user?.id || null,
        senderType: 'CUSTOMER',
        senderName: session?.user?.name || validatedData.guestName || 'Guest',
        senderEmail: session?.user?.email || validatedData.guestEmail,
        message: validatedData.description,
        messageType: 'TEXT'
      }
    });

    // Auto-assign based on category if possible
    const assignedAgent = await getAvailableAgent(validatedData.category);
    if (assignedAgent) {
      await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { assignedTo: assignedAgent.id }
      });
    }

    // Create compliance alert for high priority tickets
    if (['URGENT', 'CRITICAL'].includes(validatedData.priority)) {
      await prisma.complianceAlert.create({
        data: {
          userId: session?.user?.id || null,
          alertType: 'SYSTEM_ANOMALY' as any,
          severity: validatedData.priority === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
          title: `${validatedData.priority} Support Ticket Created`,
          description: `Ticket #${ticketNumber}: ${validatedData.subject}`,
          details: JSON.stringify({
            ticketId: ticket.id,
            ticketNumber,
            category: validatedData.category,
            priority: validatedData.priority
          }),
          status: 'OPEN'
        }
      });
    }

    // Log ticket creation
    await prisma.auditLog.create({
      data: {
        userId: session?.user?.id || null,
        action: 'SUPPORT_TICKET_CREATED',
        resource: 'SUPPORT_TICKET',
        resourceId: ticket.id,
        details: JSON.stringify({
          ticketNumber,
          category: validatedData.category,
          priority: validatedData.priority,
          subject: validatedData.subject,
          guestEmail: validatedData.guestEmail
        }),
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent'),
        outcome: 'SUCCESS'
      }
    });

    // Send notification to support team
    await notifySupportTeam(ticket, validatedData.category, validatedData.priority);

    logger.info('Support ticket created', {
      ticketId: ticket.id,
      ticketNumber,
      userId: session?.user?.id,
      category: validatedData.category,
      priority: validatedData.priority
    });

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        ticketNumber,
        status: ticket.status,
        priority: ticket.priority,
        slaDeadline: ticket.slaDeadline,
        createdAt: ticket.createdAt
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid ticket data', 
        details: error.errors 
      }, { status: 400 });
    }

    logger.error('Support ticket creation failed', error);
    return NextResponse.json({ 
      error: 'Failed to create support ticket' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tickets
    const tickets = await prisma.supportTicket.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        escalations: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    return NextResponse.json({
      tickets: tickets.map(ticket => ({
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        subject: ticket.subject,
        description: ticket.description,
        assignedTo: ticket.assignedTo,
        slaDeadline: ticket.slaDeadline,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        lastMessage: ticket.messages[0] || null,
        escalated: ticket.escalations.length > 0
      }))
    });

  } catch (error) {
    logger.error('Failed to fetch support tickets', error);
    return NextResponse.json({ 
      error: 'Failed to fetch tickets' 
    }, { status: 500 });
  }
}

// Helper functions

async function generateTicketNumber(): Promise<string> {
  const today = new Date();
  const datePrefix = today.getFullYear().toString().slice(-2) + 
                    String(today.getMonth() + 1).padStart(2, '0') + 
                    String(today.getDate()).padStart(2, '0');
  
  // Get today's ticket count
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  
  const todayCount = await prisma.supportTicket.count({
    where: {
      createdAt: {
        gte: todayStart,
        lt: todayEnd
      }
    }
  });

  const sequence = String(todayCount + 1).padStart(4, '0');
  return `CS${datePrefix}${sequence}`;
}

function getSLAHours(category: string, priority: string): number {
  // Base SLA hours by category
  const categorySLA = {
    'account': 24,
    'payments': 4,
    'gaming': 8,
    'responsible_gambling': 2,
    'compliance': 8,
    'general': 48
  };

  // Priority multipliers
  const priorityMultiplier = {
    'CRITICAL': 0.25,
    'URGENT': 0.5,
    'HIGH': 0.75,
    'MEDIUM': 1.0,
    'LOW': 2.0
  };

  const baseSLA = categorySLA[category as keyof typeof categorySLA] || 24;
  const multiplier = priorityMultiplier[priority as keyof typeof priorityMultiplier] || 1.0;

  return Math.max(1, Math.floor(baseSLA * multiplier)); // Minimum 1 hour
}

async function getAvailableAgent(category: string): Promise<{ id: string } | null> {
  try {
    // In production, this would implement proper agent assignment logic
    // based on workload, specialization, availability, etc.
    
    // For now, find any available support agent
    const supportAgents = await prisma.user.findMany({
      where: {
        role: { in: ['CUSTOMER_SUPPORT', 'COMPLIANCE_OFFICER'] },
        status: 'ACTIVE'
      },
      select: {
        id: true,
        role: true
      }
    });

    if (supportAgents.length === 0) return null;

    // Simple round-robin assignment
    const randomAgent = supportAgents[Math.floor(Math.random() * supportAgents.length)];
    return randomAgent;

  } catch (error) {
    logger.error('Failed to get available agent', error);
    return null;
  }
}

async function notifySupportTeam(
  ticket: any, 
  category: string, 
  priority: string
): Promise<void> {
  try {
    // In production, send notifications via email, Slack, etc.
    logger.info('Support ticket notification', {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      category,
      priority,
      subject: ticket.subject
    });

    // For high priority tickets, send immediate notifications
    if (['URGENT', 'CRITICAL'].includes(priority)) {
      logger.error('HIGH PRIORITY SUPPORT TICKET', {
        ticketNumber: ticket.ticketNumber,
        priority,
        category,
        subject: ticket.subject,
        slaDeadline: ticket.slaDeadline
      });
    }

  } catch (error) {
    logger.error('Failed to notify support team', error);
  }
}
