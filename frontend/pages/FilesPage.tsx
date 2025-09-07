import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import backend from '~backend/client';
import { Folder, File, Download, Lock } from 'lucide-react';

export default function FilesPage() {
  const { user, token } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null);

  const { data: filesData, isLoading } = useQuery({
    queryKey: ['files', selectedFolder],
    queryFn: async () => {
      if (!token) throw new Error('No token');
      return backend.files.listFiles({
        token,
        folderId: selectedFolder || undefined,
      });
    },
    enabled: !!token,
  });

  const handleDownload = async (fileId: number, fileName: string) => {
    if (!token) return;

    try {
      const { downloadUrl } = await backend.files.downloadFile({
        token,
        fileId,
      });

      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download started",
        description: `Downloading ${fileName}`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return <div>Please login to access files</div>;
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">{t('files.title')}</h1>
        {selectedFolder && (
          <Button variant="outline" onClick={() => setSelectedFolder(null)}>
            ← Back to Folders
          </Button>
        )}
      </div>

      {!selectedFolder ? (
        <div>
          <h2 className="text-xl font-semibold mb-4">{t('files.folders')}</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filesData?.folders.map((folder) => (
              <Card 
                key={folder.id} 
                className={`cursor-pointer transition-colors ${
                  folder.hasAccess ? 'hover:bg-muted' : 'opacity-60'
                }`}
                onClick={() => folder.hasAccess && setSelectedFolder(folder.id)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Folder className="h-6 w-6 mr-2" />
                      {folder.name}
                    </div>
                    {!folder.hasAccess && <Lock className="h-5 w-5" />}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">
                    {folder.description}
                  </p>
                  {folder.hasAccess ? (
                    <Badge variant="secondary">{t('files.hasAccess')}</Badge>
                  ) : (
                    <Badge variant="destructive">
                      {t('files.noAccess')} ${folder.minDonationAmount}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-semibold mb-4">
            Files in {filesData?.folders.find(f => f.id === selectedFolder)?.name}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filesData?.files.map((file) => (
              <Card key={file.id}>
                <CardHeader>
                  <CardTitle className="flex items-center text-base">
                    <File className="h-5 w-5 mr-2" />
                    {file.originalName}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">
                    Type: {file.fileType}
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Size: {(file.fileSize / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <Button 
                    onClick={() => handleDownload(file.id, file.originalName)}
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {t('files.download')}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          {filesData?.files.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No files in this folder yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
