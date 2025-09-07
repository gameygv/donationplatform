import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import DonationForm from '../components/DonationForm';
import { Heart, FileText, Video, Download } from 'lucide-react';

export default function HomePage() {
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          {t('home.title')}
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          {t('home.subtitle')}
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Heart className="h-6 w-6 mr-2 text-red-500" />
                {t('home.whyDonate')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3">
                <FileText className="h-5 w-5 mt-1 text-blue-500" />
                <div>
                  <h3 className="font-semibold">{t('home.exclusiveDocuments')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('home.exclusiveDocumentsDesc')}
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Video className="h-5 w-5 mt-1 text-green-500" />
                <div>
                  <h3 className="font-semibold">{t('home.videoContent')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('home.videoContentDesc')}
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Download className="h-5 w-5 mt-1 text-purple-500" />
                <div>
                  <h3 className="font-semibold">{t('home.downloadAccess')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('home.downloadAccessDesc')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {!user && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground mb-4">
                  {t('home.loginPrompt')}
                </p>
                <div className="text-center">
                  <Link to="/login">
                    <Button variant="outline">{t('home.loginLink')}</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          {user ? (
            <DonationForm />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-muted-foreground mb-4">
                    {t('home.pleaseRegisterLogin')}
                  </p>
                  <div className="space-x-2">
                    <Link to="/register">
                      <Button>{t('nav.register')}</Button>
                    </Link>
                    <Link to="/login">
                      <Button variant="outline">{t('nav.login')}</Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
