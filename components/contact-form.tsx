'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/lib/use-toast';
import { Locale } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address').max(255),
  subject: z.string().min(1, 'Subject is required').max(200),
  message: z.string().min(10, 'Message must be at least 10 characters').max(1000),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface ContactFormProps {
  locale: Locale;
  dictionary: {
    contact: {
      form: {
        name: string;
        email: string;
        subject: string;
        message: string;
        submit: string;
        sending: string;
        success: string;
        error: string;
      };
    };
  };
}

export function ContactForm({ locale, dictionary }: ContactFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '',
        },
        body: JSON.stringify({
          ...data,
          locale,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      toast({
        title: dictionary.contact.form.success,
        description: 'Thank you for your message. We\'ll get back to you soon.',
      });

      reset();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: dictionary.contact.form.error,
        description: 'Please try again later.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="name">
                {dictionary.contact.form.name} *
              </Label>
              <Input
                id="name"
                type="text"
                className={cn(
                  'mt-1',
                  errors.name && 'border-red-500 focus:border-red-500'
                )}
                {...register('name')}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="email">
                {dictionary.contact.form.email} *
              </Label>
              <Input
                id="email"
                type="email"
                className={cn(
                  'mt-1',
                  errors.email && 'border-red-500 focus:border-red-500'
                )}
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.email.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="subject">
              {dictionary.contact.form.subject} *
            </Label>
            <Input
              id="subject"
              type="text"
              className={cn(
                'mt-1',
                errors.subject && 'border-red-500 focus:border-red-500'
              )}
              {...register('subject')}
            />
            {errors.subject && (
              <p className="mt-1 text-sm text-red-600">
                {errors.subject.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="message">
              {dictionary.contact.form.message} *
            </Label>
            <Textarea
              id="message"
              rows={6}
              className={cn(
                'mt-1',
                errors.message && 'border-red-500 focus:border-red-500'
              )}
              placeholder={locale === 'ar' 
                ? 'اكتب رسالتك هنا...'
                : 'Write your message here...'}
              {...register('message')}
            />
            {errors.message && (
              <p className="mt-1 text-sm text-red-600">
                {errors.message.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting 
              ? dictionary.contact.form.sending 
              : dictionary.contact.form.submit}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
