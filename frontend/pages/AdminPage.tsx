import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import backend from '~backend/client';
import { Users, DollarSign, Eye, Upload } from 'lucide-react';

export default function AdminPage() {
  const { user, token } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [uploadForm, setUploadForm] = useState({
    folderId: 1,
    file: null as File | null,
  });

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      if (!token) throw new Error('No token');
      return backend.admin.listUsers({ token });
    },
    enabled: !!token && user?.isAdmin,
  });

  const { data: userDetails } = useQuery({
    queryKey: ['admin-user-details', selectedUser],
    queryFn: async () => {
      if (!token || !selectedUser) throw new Error('No token or user');
      return backend.admin.getUserDetails({ token, userId: selectedUser });
    },
    enabled: !!token && !!selectedUser,
  });

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !uploadForm.file) return;

    try {
      const { uploadUrl, fileId } = await backend.admin.uploadFile({
        token,
        folderId: uploadForm.folderId,
        fileName: uploadForm.file.name,
        fileType: uploadForm.file.type,
        fileSize: uploadForm.file.size,
      });

      // Upload file to signed URL
      const formData = new FormData();
      formData.append('file', uploadForm.file);

      await fetch(uploadUrl, {
        method: 'PUT',
        body: uploadForm.file,
        headers: {
          'Content-Type': uploadForm.file.type,
        },
      });

      toast({
        title: "File uploaded",
        description: `${uploadForm.file.name} has been uploaded successfully`,
      });

      setUploadForm({ folderId: 1, file: null });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload file",
        variant: "destructive",
      });
    }
  };

  if (!user?.isAdmin) {
    return <div>{t('admin.accessDenied')}</div>;
  }

  if (isLoading) {
    return <div>{t('common.loading')}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">{t('admin.title')}</h1>

      <div className="grid lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.totalUsers')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usersData?.total || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.totalDonations')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${usersData?.users.reduce((sum, user) => sum + user.totalDonated, 0).toFixed(2) || '0.00'}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload className="h-5 w-5 mr-2" />
              {t('admin.uploadFile')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <Label htmlFor="folderId">{t('admin.folder')}</Label>
                <select
                  id="folderId"
                  value={uploadForm.folderId}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, folderId: parseInt(e.target.value) }))}
                  className="w-full p-2 border rounded"
                >
                  <option value={1}>{t('admin.general')}</option>
                  <option value={2}>{t('admin.premium')}</option>
                </select>
              </div>
              <div>
                <Label htmlFor="file">{t('admin.file')}</Label>
                <Input
                  id="file"
                  type="file"
                  onChange={(e) => setUploadForm(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                  required
                />
              </div>
              <Button type="submit" disabled={!uploadForm.file}>
                {t('admin.upload')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.users')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {usersData?.users.map((userData) => (
              <div key={userData.id} className="flex items-center justify-between p-4 border rounded">
                <div>
                  <h3 className="font-semibold">{userData.firstName} {userData.lastName}</h3>
                  <p className="text-sm text-muted-foreground">{userData.email}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="secondary">
                      ${userData.totalDonated.toFixed(2)} {t('admin.donated')}
                    </Badge>
                    <Badge variant="outline">
                      {userData.donationCount} {t('admin.donations')}
                    </Badge>
                    {userData.isAdmin && (
                      <Badge variant="destructive">{t('admin.admin')}</Badge>
                    )}
                  </div>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedUser(userData.id)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {t('admin.viewDetails')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{t('admin.userDetails')}</DialogTitle>
                    </DialogHeader>
                    {userDetails && (
                      <div className="space-y-6">
                        <div>
                          <h3 className="font-semibold mb-2">{t('admin.profile')}</h3>
                          <p><strong>{t('admin.name')}</strong> {userDetails.user.firstName} {userDetails.user.lastName}</p>
                          <p><strong>{t('admin.email')}</strong> {userDetails.user.email}</p>
                          <p><strong>{t('admin.language')}</strong> {userDetails.user.language}</p>
                          <p><strong>{t('admin.totalDonated')}</strong> ${userDetails.user.totalDonated.toFixed(2)}</p>
                        </div>

                        <div>
                          <h3 className="font-semibold mb-2">{t('admin.recentDonations')}</h3>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {userDetails.donations.map((donation) => (
                              <div key={donation.id} className="flex justify-between items-center p-2 bg-muted rounded">
                                <span>${donation.amount.toFixed(2)} {donation.currency}</span>
                                <span className="text-sm text-muted-foreground">
                                  {new Date(donation.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h3 className="font-semibold mb-2">{t('admin.folderAccess')}</h3>
                          <div className="space-y-1">
                            {userDetails.folderAccess.map((access) => (
                              <Badge key={access.id} variant="secondary">
                                {access.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
