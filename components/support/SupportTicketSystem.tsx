'use client';

import { useState, useEffect } from 'react';
import { AuthUser } from '@/lib/auth';
import Link from 'next/link';
import { 
  ChatBubbleLeftRightIcon as MessageCircleIcon,
  PlusIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowUpIcon,
  MagnifyingGlassIcon as SearchIcon,
  TagIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon as MailIcon
} from '@heroicons/react/24/outline';

interface SupportTicketSystemProps {
  user: AuthUser | null;
  userProfile: any;
  existingTickets: any[];
  commonIssues: any[];
  supportCategories: any[];
}

interface NewTicket {
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  subject: string;
  description: string;
  guestEmail?: string;
  guestName?: string;
}

export default function SupportTicketSystem({ 
  user, 
  userProfile, 
  existingTickets, 
  commonIssues, 
  supportCategories 
}: SupportTicketSystemProps) {
  const [activeTab, setActiveTab] = useState<'faq' | 'contact' | 'tickets' | 'chat'>('faq');
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  const [newTicket, setNewTicket] = useState<NewTicket>({
    category: '',
    priority: 'MEDIUM',
    subject: '',
    description: '',
    guestEmail: '',
    guestName: ''
  });

  const [tickets, setTickets] = useState(existingTickets);
  const [filteredFAQs, setFilteredFAQs] = useState(commonIssues);

  useEffect(() => {
    // Filter FAQs based on search and category
    let filtered = commonIssues;
    
    if (searchQuery) {
      filtered = filtered.filter(issue => 
        issue.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issue.answer.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedCategory) {
      filtered = filtered.filter(issue => issue.category === selectedCategory);
    }
    
    setFilteredFAQs(filtered);
  }, [searchQuery, selectedCategory, commonIssues]);

  const handleCreateTicket = async () => {
    setLoading(true);
    
    try {
      const ticketData = {
        ...newTicket,
        userId: user?.id || null
      };

      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ticketData),
      });

      if (!response.ok) {
        throw new Error('Failed to create ticket');
      }

      const result = await response.json();
      
      // Add new ticket to list
      setTickets(prev => [result.ticket, ...prev]);
      
      // Reset form
      setNewTicket({
        category: '',
        priority: 'MEDIUM',
        subject: '',
        description: '',
        guestEmail: '',
        guestName: ''
      });
      
      setShowNewTicket(false);
      setActiveTab('tickets');
      
      alert(`Ticket #${result.ticket.ticketNumber} created successfully`);

    } catch (error) {
      console.error('Error creating ticket:', error);
      alert('Failed to create ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'text-red-600 bg-red-100';
      case 'URGENT': return 'text-orange-600 bg-orange-100';
      case 'HIGH': return 'text-yellow-600 bg-yellow-100';
      case 'MEDIUM': return 'text-blue-600 bg-blue-100';
      case 'LOW': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'text-green-600 bg-green-100';
      case 'IN_PROGRESS': return 'text-blue-600 bg-blue-100';
      case 'WAITING_CUSTOMER': return 'text-yellow-600 bg-yellow-100';
      case 'ESCALATED': return 'text-red-600 bg-red-100';
      case 'RESOLVED': return 'text-purple-600 bg-purple-100';
      case 'CLOSED': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUniqueCategories = () => {
    const categories = new Set(commonIssues.map(issue => issue.category));
    return Array.from(categories);
  };

  const tabs = [
    { id: 'faq', name: 'FAQ & Help', icon: SearchIcon },
    { id: 'contact', name: 'Contact Methods', icon: PhoneIcon },
    { id: 'tickets', name: user ? 'My Tickets' : 'Submit Ticket', icon: MessageCircleIcon },
    { id: 'chat', name: 'Live Chat', icon: MessageCircleIcon },
  ];

  return (
    <div className="space-y-6">
      
      {/* Emergency Support Banner */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Need Immediate Help?</h3>
            <div className="text-sm text-red-700 mt-1">
              <p><strong>Crisis Support:</strong> If you need immediate help with gambling problems, contact GamCare at 0808 8020 133 (24/7, free)</p>
              <p><strong>Emergency:</strong> For urgent account security issues, use live chat or call our emergency line</p>
            </div>
          </div>
        </div>
      </div>

      {/* User Account Status (if logged in) */}
      {user && userProfile && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Account Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-600 font-medium">Verification Status</div>
              <div className={`text-lg font-bold ${
                userProfile.kycProfile?.status === 'APPROVED' ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {userProfile.kycProfile?.status?.replace('_', ' ') || 'Not Started'}
              </div>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-sm text-green-600 font-medium">Wallet Balance</div>
              <div className="text-lg font-bold text-green-800">
                ${userProfile.wallet?.balance?.toFixed(2) || '0.00'}
              </div>
            </div>

            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-sm text-purple-600 font-medium">RG Status</div>
              <div className={`text-lg font-bold ${
                userProfile.rgProfile?.status === 'ACTIVE' ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {userProfile.rgProfile?.status?.replace('_', ' ') || 'Active'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-5 w-5 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        
        {activeTab === 'faq' && (
          <div className="space-y-6">
            
            {/* Search and Filter */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                    Search FAQs
                  </label>
                  <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      id="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Search for help..."
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by Category
                  </label>
                  <select
                    id="category"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Categories</option>
                    {getUniqueCategories().map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* FAQ Results */}
            <div className="space-y-4">
              {filteredFAQs.map((issue) => (
                <div key={issue.id} className="bg-white shadow rounded-lg p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {issue.question}
                      </h3>
                      <p className="text-gray-700 mb-3">{issue.answer}</p>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {issue.category}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredFAQs.length === 0 && (
                <div className="text-center py-8">
                  <SearchIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No results found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Try adjusting your search or <button 
                      onClick={() => setActiveTab('tickets')} 
                      className="text-blue-600 hover:text-blue-500"
                    >create a support ticket</button>.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'contact' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Live Chat */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center mb-4">
                <MessageCircleIcon className="h-6 w-6 text-green-500 mr-3" />
                <h3 className="text-lg font-medium text-gray-900">Live Chat</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Get instant help from our support team
              </p>
              <ul className="text-sm text-gray-600 space-y-2 mb-4">
                <li>• Available 24/7</li>
                <li>• Average response: Under 2 minutes</li>
                <li>• Account-specific help</li>
                <li>• Immediate assistance</li>
              </ul>
              <button
                onClick={() => setActiveTab('chat')}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                Start Live Chat
              </button>
            </div>

            {/* Email Support */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center mb-4">
                <MailIcon className="h-6 w-6 text-blue-500 mr-3" />
                <h3 className="text-lg font-medium text-gray-900">Email Support</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Send detailed queries via email
              </p>
              <ul className="text-sm text-gray-600 space-y-2 mb-4">
                <li>• Response within 4 hours</li>
                <li>• Detailed explanations</li>
                <li>• File attachments supported</li>
                <li>• Full conversation history</li>
              </ul>
              <div className="space-y-2">
                <a 
                  href="mailto:support@casino.com" 
                  className="block w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-center"
                >
                  support@casino.com
                </a>
                <a 
                  href="mailto:complaints@casino.com" 
                  className="block w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-center text-sm"
                >
                  Formal Complaints
                </a>
              </div>
            </div>

            {/* Phone Support */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center mb-4">
                <PhoneIcon className="h-6 w-6 text-purple-500 mr-3" />
                <h3 className="text-lg font-medium text-gray-900">Phone Support</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Speak directly with our support team
              </p>
              <ul className="text-sm text-gray-600 space-y-2 mb-4">
                <li>• Available 9 AM - 11 PM GMT</li>
                <li>• Immediate assistance</li>
                <li>• Account verification required</li>
                <li>• Free from UK landlines</li>
              </ul>
              <div className="space-y-2">
                <div className="w-full bg-purple-600 text-white px-4 py-2 rounded-md text-center font-medium">
                  +44 [PHONE_NUMBER]
                </div>
                <p className="text-xs text-gray-500 text-center">
                  International rates may apply
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tickets' && (
          <div className="space-y-6">
            
            {/* Create New Ticket */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Support Tickets</h3>
                <button
                  onClick={() => setShowNewTicket(!showNewTicket)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  New Ticket
                </button>
              </div>

              {showNewTicket && (
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h4 className="font-medium text-gray-900 mb-4">Create Support Ticket</h4>
                  
                  <div className="space-y-4">
                    {!user && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Your Name
                          </label>
                          <input
                            type="text"
                            value={newTicket.guestName}
                            onChange={(e) => setNewTicket(prev => ({ ...prev, guestName: e.target.value }))}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter your full name"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email Address
                          </label>
                          <input
                            type="email"
                            value={newTicket.guestEmail}
                            onChange={(e) => setNewTicket(prev => ({ ...prev, guestEmail: e.target.value }))}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            placeholder="your@email.com"
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Category
                        </label>
                        <select
                          value={newTicket.category}
                          onChange={(e) => setNewTicket(prev => ({ ...prev, category: e.target.value }))}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select Category</option>
                          {supportCategories.map(category => (
                            <option key={category.id} value={category.id}>
                              {category.icon} {category.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Priority
                        </label>
                        <select
                          value={newTicket.priority}
                          onChange={(e) => setNewTicket(prev => ({ ...prev, priority: e.target.value as any }))}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="LOW">Low - General inquiry</option>
                          <option value="MEDIUM">Medium - Standard issue</option>
                          <option value="HIGH">High - Account problem</option>
                          <option value="URGENT">Urgent - Payment issue</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subject
                      </label>
                      <input
                        type="text"
                        value={newTicket.subject}
                        onChange={(e) => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Brief description of your issue"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        rows={6}
                        value={newTicket.description}
                        onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Please provide detailed information about your issue, including any error messages, transaction IDs, or steps you've already tried..."
                      />
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => setShowNewTicket(false)}
                        className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateTicket}
                        disabled={loading || !newTicket.category || !newTicket.subject || !newTicket.description}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        {loading ? 'Creating...' : 'Create Ticket'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Existing Tickets */}
            {user && tickets.length > 0 && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Your Support Tickets</h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {tickets.map((ticket: any) => (
                    <div key={ticket.id} className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <span className="font-medium text-gray-900">
                            #{ticket.ticketNumber}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                            {ticket.priority}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                            {ticket.status.replace('_', ' ')}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {formatDate(ticket.createdAt)}
                        </span>
                      </div>
                      
                      <h4 className="font-medium text-gray-900 mb-2">{ticket.subject}</h4>
                      <p className="text-gray-600 text-sm mb-3">{ticket.description}</p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>Category: {ticket.category}</span>
                          {ticket.assignedTo && <span>Assigned</span>}
                          {ticket.messages && ticket.messages.length > 0 && (
                            <span>Last reply: {formatDate(ticket.messages[0].createdAt)}</span>
                          )}
                        </div>
                        <Link
                          href={`/support/ticket/${ticket.ticketNumber}`}
                          className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                        >
                          View Details →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {user && tickets.length === 0 && !showNewTicket && (
              <div className="bg-white shadow rounded-lg p-6 text-center">
                <MessageCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No support tickets</h3>
                <p className="mt-1 text-sm text-gray-500">
                  You haven't created any support tickets yet.
                </p>
                <button
                  onClick={() => setShowNewTicket(true)}
                  className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Create Your First Ticket
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="text-center py-12">
              <MessageCircleIcon className="mx-auto h-16 w-16 text-blue-400 mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">Live Chat Support</h3>
              <p className="text-gray-600 mb-6">
                Connect with our support team for immediate assistance
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6 text-left">
                <h4 className="font-medium text-blue-900 mb-2">Before you chat:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Have your account details ready</li>
                  <li>• Prepare any relevant transaction IDs</li>
                  <li>• Check our FAQ for quick answers</li>
                  <li>• Be ready to verify your identity</li>
                </ul>
              </div>

              <div className="space-y-4">
                <button className="bg-blue-600 text-white px-8 py-3 rounded-md hover:bg-blue-700 font-medium">
                  Start Live Chat
                </button>
                
                <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    <span>Support Online</span>
                  </div>
                  <div className="flex items-center">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    <span>Avg. wait: 2 min</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Support Categories Reference */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Support Categories & Response Times</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {supportCategories.map(category => (
            <div key={category.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-3">{category.icon}</span>
                <div>
                  <h4 className="font-medium text-gray-900">{category.name}</h4>
                  <p className="text-xs text-gray-500">Response: {category.slaHours}h</p>
                </div>
              </div>
              <p className="text-sm text-gray-600">{category.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Escalation Information */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-center mb-3">
          <ArrowUpIcon className="h-5 w-5 text-yellow-400 mr-2" />
          <h3 className="text-lg font-medium text-yellow-900">Escalation Procedures</h3>
        </div>
        <div className="text-sm text-yellow-800 space-y-2">
          <p><strong>Step 1:</strong> Contact our customer support team (live chat, email, or phone)</p>
          <p><strong>Step 2:</strong> If unresolved within 5 business days, escalate to formal complaints</p>
          <p><strong>Step 3:</strong> Independent dispute resolution through our ADR provider</p>
          <p><strong>Step 4:</strong> Contact our regulatory authority as a final resort</p>
        </div>
        <div className="mt-4">
          <Link 
            href="/complaints" 
            className="text-yellow-700 hover:text-yellow-900 font-medium underline"
          >
            Learn more about dispute resolution →
          </Link>
        </div>
      </div>
    </div>
  );
}
