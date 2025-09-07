import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import backend from '~backend/client';

export default function DonationForm() {
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const stripe = useStripe();
  const elements = useElements();
  const { token } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements || !token) return;

    const donationAmount = parseFloat(amount);
    if (donationAmount < 5 || donationAmount > 1000) {
      toast({
        title: "Invalid amount",
        description: "Amount must be between $5 and $1000",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Create payment intent
      const { clientSecret } = await backend.payments.createPaymentIntent({
        amount: donationAmount,
        currency: 'USD',
        userToken: token,
      });

      // Confirm payment
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (paymentIntent.status === 'succeeded') {
        // Confirm donation in backend
        await backend.payments.confirmDonation({
          paymentIntentId: paymentIntent.id,
          userToken: token,
        });

        toast({
          title: "Donation successful!",
          description: `Thank you for your donation of $${donationAmount}`,
        });

        setAmount('');
        elements.getElement(CardElement)?.clear();
      }
    } catch (error) {
      console.error('Donation error:', error);
      toast({
        title: "Donation failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{t('donation.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="amount">{t('donation.amount')}</Label>
            <Input
              id="amount"
              type="number"
              min="5"
              max="1000"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="25.00"
              required
            />
            <p className="text-sm text-muted-foreground mt-1">
              {t('donation.minAmount')} - {t('donation.maxAmount')}
            </p>
          </div>

          <div>
            <Label>{t('donation.cardDetails')}</Label>
            <div className="border rounded-md p-3 mt-1">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: 'hsl(var(--foreground))',
                      '::placeholder': {
                        color: 'hsl(var(--muted-foreground))',
                      },
                    },
                  },
                }}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={!stripe || isProcessing}
          >
            {isProcessing ? t('donation.processing') : t('donation.donate')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
