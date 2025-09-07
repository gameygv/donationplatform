import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import backend from '~backend/client';
import { Users, DollarSign, Eye, Upload, Folder, Plus, Edit, Trash2, FileText, UserPlus } from 'lucide-react';

export default function AdminPage() {
  const { user, token } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null);
  const [uploadForm, setUploadForm] = useState({
    folderId: 1,
    file: null as File | null,
  });
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    language: 'es',
    isAdmin: false,
  });
  const [folderForm, setFolderForm] = useState({
    name: '',
    description: '',
    minDonationAmount: 0,
  });
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editingFolder, setEditingFolder] = useState<any>(null);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);

  // Queries
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      if (!token) throw new Error('No token');
      return backend.admin.listUsers({ token });
    },
    enabled: !!token && user?.isAdmin,
  });

  const { data: foldersData, isLoading: foldersLoading } = useQuery({
    queryKey: ['admin-folders'],
    queryFn: async () => {
      if (!token) throw new Error('No token');
      return backend.admin.listFolders({ token });
    },
    enabled: !!token && user?.isAdmin,
  });

  const { data: filesData, isLoading: filesLoading } = useQuery({
    queryKey: ['admin-files'],
    queryFn: async () => {
      if (!token) throw new Error('No token');
      return backend.admin.listFiles({ token });
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

  // Mutations
  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      if (!token) throw new Error('No token');
      return backend.admin.createUser({ token, ...userData });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: "Usuario creado exitosamente" });
      setUserForm({ email: '', password: '', firstName: '', lastName: '', language: 'es', isAdmin: false });
      setIsCreateUserOpen(false);
    },
    onError: (error) => {
      toast({ title: "Error al crear usuario", description: error.message, variant: "destructive" });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      if (!token) throw new Error('No token');
      return backend.admin.updateUser({ token, ...userData });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: "Usuario actualizado exitosamente" });
      setEditingUser(null);
    },
    onError: (error) => {
      toast({ title: "Error al actualizar usuario", description: error.message, variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      if (!token) throw new Error('No token');
      return backend.admin.deleteUser({ token, userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: "Usuario eliminado exitosamente" });
    },
    onError: (error) => {
      toast({ title: "Error al eliminar usuario", description: error.message, variant: "destructive" });
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: async (folderData: any) => {
      if (!token) throw new Error('No token');
      return backend.admin.createFolder({ token, ...folderData });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-folders'] });
      toast({ title: "Carpeta creada exitosamente" });
      setFolderForm({ name: '', description: '', minDonationAmount: 0 });
      setIsCreateFolderOpen(false);
    },
    onError: (error) => {
      toast({ title: "Error al crear carpeta", description: error.message, variant: "destructive" });
    },
  });

  const updateFolderMutation = useMutation({
    mutationFn: async (folderData: any) => {
      if (!token) throw new Error('No token');
      return backend.admin.updateFolder({ token, ...folderData });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-folders'] });
      toast({ title: "Carpeta actualizada exitosamente" });
      setEditingFolder(null);
    },
    onError: (error) => {
      toast({ title: "Error al actualizar carpeta", description: error.message, variant: "destructive" });
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId: number) => {
      if (!token) throw new Error('No token');
      return backend.admin.deleteFolder({ token, folderId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-folders'] });
      toast({ title: "Carpeta eliminada exitosamente" });
    },
    onError: (error) => {
      toast({ title: "Error al eliminar carpeta", description: error.message, variant: "destructive" });
    },
  });

  const grantAccessMutation = useMutation({
    mutationFn: async ({ userId, folderId }: { userId: number; folderId: number }) => {
      if (!token) throw new Error('No token');
      return backend.admin.grantFolderAccess({ token, userId, folderId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-details'] });
      toast({ title: "Acceso concedido exitosamente" });
    },
    onError: (error) => {
      toast({ title: "Error al conceder acceso", description: error.message, variant: "destructive" });
    },
  });

  const revokeAccessMutation = useMutation({
    mutationFn: async ({ userId, folderId }: { userId: number; folderId: number }) => {
      if (!token) throw new Error('No token');
      return backend.admin.revokeFolderAccess({ token, userId, folderId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-details'] });
      toast({ title: "Acceso revocado exitosamente" });
    },
    onError: (error) => {
      toast({ title: "Error al revocar acceso", description: error.message, variant: "destructive" });
    },
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

      await fetch(uploadUrl, {
        method: 'PUT',
        body: uploadForm.file,
        headers: {
          'Content-Type': uploadForm.file.type,
        },
      });

      queryClient.invalidateQueries({ queryKey: ['admin-files'] });
      toast({ title: "Archivo subido exitosamente" });
      setUploadForm({ folderId: 1, file: null });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: "Error al subir archivo", variant: "destructive" });
    }
  };

  if (!user?.isAdmin) {
    return <div>{t('admin.accessDenied')}</div>;
  }

  if (usersLoading || foldersLoading || filesLoading) {
    return <div>{t('common.loading')}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">{t('admin.title')}</h1>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="folders">Carpetas</TabsTrigger>
          <TabsTrigger value="files">Archivos</TabsTrigger>
          <TabsTrigger value="upload">Subir Archivo</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Usuarios</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{usersData?.total || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Donaciones</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${usersData?.users.reduce((sum, user) => sum + user.totalDonated, 0).toFixed(2) || '0.00'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Carpetas</CardTitle>
                <Folder className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{foldersData?.folders.length || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Archivos</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{filesData?.total || 0}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Gestión de Usuarios</h2>
            <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Crear Usuario
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                </DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  createUserMutation.mutate(userForm);
                }} className="space-y-4">
                  <div>
                    <Label htmlFor="email">Correo Electrónico</Label>
                    <Input
                      id="email"
                      type="email"
                      value={userForm.email}
                      onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Contraseña</Label>
                    <Input
                      id="password"
                      type="password"
                      value={userForm.password}
                      onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                      required
                      minLength={6}
                    />
                  </div>
                  <div>
                    <Label htmlFor="firstName">Nombre</Label>
                    <Input
                      id="firstName"
                      value={userForm.firstName}
                      onChange={(e) => setUserForm(prev => ({ ...prev, firstName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Apellido</Label>
                    <Input
                      id="lastName"
                      value={userForm.lastName}
                      onChange={(e) => setUserForm(prev => ({ ...prev, lastName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="language">Idioma</Label>
                    <Select value={userForm.language} onValueChange={(value) => setUserForm(prev => ({ ...prev, language: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isAdmin"
                      checked={userForm.isAdmin}
                      onChange={(e) => setUserForm(prev => ({ ...prev, isAdmin: e.target.checked }))}
                    />
                    <Label htmlFor="isAdmin">Es Administrador</Label>
                  </div>
                  <Button type="submit" className="w-full" disabled={createUserMutation.isPending}>
                    {createUserMutation.isPending ? 'Creando...' : 'Crear Usuario'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent>
              <div className="space-y-4">
                {usersData?.users.map((userData) => (
                  <div key={userData.id} className="flex items-center justify-between p-4 border rounded">
                    <div>
                      <h3 className="font-semibold">{userData.firstName} {userData.lastName}</h3>
                      <p className="text-sm text-muted-foreground">{userData.email}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="secondary">
                          ${userData.totalDonated.toFixed(2)} donado
                        </Badge>
                        <Badge variant="outline">
                          {userData.donationCount} donaciones
                        </Badge>
                        {userData.isAdmin && (
                          <Badge variant="destructive">Administrador</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setSelectedUser(userData.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalles
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                          <DialogHeader>
                            <DialogTitle>Detalles del Usuario</DialogTitle>
                          </DialogHeader>
                          {userDetails && (
                            <div className="space-y-6">
                              <div>
                                <h3 className="font-semibold mb-2">Perfil</h3>
                                <p><strong>Nombre:</strong> {userDetails.user.firstName} {userDetails.user.lastName}</p>
                                <p><strong>Correo:</strong> {userDetails.user.email}</p>
                                <p><strong>Idioma:</strong> {userDetails.user.language}</p>
                                <p><strong>Total Donado:</strong> ${userDetails.user.totalDonated.toFixed(2)}</p>
                              </div>

                              <div>
                                <h3 className="font-semibold mb-2">Acceso a Carpetas</h3>
                                <div className="space-y-2">
                                  {userDetails.folderAccess.map((access) => (
                                    <div key={access.id} className="flex items-center justify-between p-2 border rounded">
                                      <Badge variant="secondary">{access.name}</Badge>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => revokeAccessMutation.mutate({ userId: userData.id, folderId: access.id })}
                                      >
                                        Revocar
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                                
                                <div className="mt-4">
                                  <h4 className="font-medium mb-2">Conceder Acceso a Carpeta</h4>
                                  <div className="flex space-x-2">
                                    <Select onValueChange={(value) => grantAccessMutation.mutate({ userId: userData.id, folderId: parseInt(value) })}>
                                      <SelectTrigger className="w-48">
                                        <SelectValue placeholder="Seleccionar carpeta" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {foldersData?.folders.map((folder) => (
                                          <SelectItem key={folder.id} value={folder.id.toString()}>
                                            {folder.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <h3 className="font-semibold mb-2">Donaciones Recientes</h3>
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
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingUser(userData)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      {!userData.isAdmin && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
                              deleteUserMutation.mutate(userData.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {editingUser && (
            <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar Usuario</DialogTitle>
                </DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target as HTMLFormElement);
                  updateUserMutation.mutate({
                    userId: editingUser.id,
                    email: formData.get('email') as string,
                    firstName: formData.get('firstName') as string,
                    lastName: formData.get('lastName') as string,
                    language: formData.get('language') as string,
                    isAdmin: formData.get('isAdmin') === 'on',
                    newPassword: formData.get('newPassword') as string || undefined,
                  });
                }} className="space-y-4">
                  <div>
                    <Label htmlFor="email">Correo Electrónico</Label>
                    <Input name="email" defaultValue={editingUser.email} required />
                  </div>
                  <div>
                    <Label htmlFor="firstName">Nombre</Label>
                    <Input name="firstName" defaultValue={editingUser.firstName || ''} />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Apellido</Label>
                    <Input name="lastName" defaultValue={editingUser.lastName || ''} />
                  </div>
                  <div>
                    <Label htmlFor="language">Idioma</Label>
                    <Select name="language" defaultValue={editingUser.language}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="newPassword">Nueva Contraseña (opcional)</Label>
                    <Input name="newPassword" type="password" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="isAdmin"
                      defaultChecked={editingUser.isAdmin}
                    />
                    <Label>Es Administrador</Label>
                  </div>
                  <Button type="submit" className="w-full" disabled={updateUserMutation.isPending}>
                    {updateUserMutation.isPending ? 'Actualizando...' : 'Actualizar Usuario'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </TabsContent>

        <TabsContent value="folders" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Gestión de Carpetas</h2>
            <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Carpeta
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Nueva Carpeta</DialogTitle>
                </DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  createFolderMutation.mutate(folderForm);
                }} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nombre de la Carpeta</Label>
                    <Input
                      id="name"
                      value={folderForm.name}
                      onChange={(e) => setFolderForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea
                      id="description"
                      value={folderForm.description}
                      onChange={(e) => setFolderForm(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="minDonationAmount">Donación Mínima Requerida ($USD)</Label>
                    <Input
                      id="minDonationAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={folderForm.minDonationAmount}
                      onChange={(e) => setFolderForm(prev => ({ ...prev, minDonationAmount: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={createFolderMutation.isPending}>
                    {createFolderMutation.isPending ? 'Creando...' : 'Crear Carpeta'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {foldersData?.folders.map((folder) => (
              <Card key={folder.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Folder className="h-5 w-5 mr-2" />
                      {folder.name}
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingFolder(folder)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {folder.id > 2 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('¿Estás seguro de que quieres eliminar esta carpeta?')) {
                              deleteFolderMutation.mutate(folder.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">{folder.description}</p>
                  <div className="space-y-1">
                    <p className="text-sm"><strong>Donación mínima:</strong> ${folder.minDonationAmount}</p>
                    <p className="text-sm"><strong>Archivos:</strong> {folder.fileCount}</p>
                    <p className="text-sm"><strong>Usuarios con acceso:</strong> {folder.userCount}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {editingFolder && (
            <Dialog open={!!editingFolder} onOpenChange={() => setEditingFolder(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar Carpeta</DialogTitle>
                </DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target as HTMLFormElement);
                  updateFolderMutation.mutate({
                    folderId: editingFolder.id,
                    name: formData.get('name') as string,
                    description: formData.get('description') as string,
                    minDonationAmount: parseFloat(formData.get('minDonationAmount') as string),
                  });
                }} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nombre de la Carpeta</Label>
                    <Input name="name" defaultValue={editingFolder.name} required />
                  </div>
                  <div>
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea name="description" defaultValue={editingFolder.description || ''} />
                  </div>
                  <div>
                    <Label htmlFor="minDonationAmount">Donación Mínima Requerida ($USD)</Label>
                    <Input
                      name="minDonationAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={editingFolder.minDonationAmount}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={updateFolderMutation.isPending}>
                    {updateFolderMutation.isPending ? 'Actualizando...' : 'Actualizar Carpeta'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </TabsContent>

        <TabsContent value="files" className="space-y-6">
          <h2 className="text-2xl font-bold">Gestión de Archivos</h2>
          
          <Card>
            <CardContent>
              <div className="space-y-4">
                {filesData?.files.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-4 border rounded">
                    <div>
                      <h3 className="font-semibold">{file.originalName}</h3>
                      <p className="text-sm text-muted-foreground">
                        Carpeta: {file.folderName} | Tipo: {file.fileType} | 
                        Tamaño: {(file.fileSize / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Subido: {new Date(file.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (confirm('¿Estás seguro de que quieres eliminar este archivo?')) {
                          // TODO: Implement file deletion
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="h-5 w-5 mr-2" />
                Subir Archivo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <Label htmlFor="folderId">Carpeta de Destino</Label>
                  <Select 
                    value={uploadForm.folderId.toString()} 
                    onValueChange={(value) => setUploadForm(prev => ({ ...prev, folderId: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {foldersData?.folders.map((folder) => (
                        <SelectItem key={folder.id} value={folder.id.toString()}>
                          {folder.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="file">Archivo</Label>
                  <Input
                    id="file"
                    type="file"
                    onChange={(e) => setUploadForm(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                    required
                  />
                </div>
                <Button type="submit" disabled={!uploadForm.file} className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  Subir Archivo
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
