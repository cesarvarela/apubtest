import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ContentManager from './ContentManager';
import ContentHeader from './ContentHeader';
import { Database } from 'lucide-react';

export default async function ContentPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <ContentHeader />
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>Content Management</span>
          </CardTitle>
          <CardDescription>
            Manage all content types using the new content system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ContentManager />
        </CardContent>
      </Card>
    </div>
  );
} 