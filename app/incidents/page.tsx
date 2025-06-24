import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import IncidentManager from './list/IncidentManager';
import IncidentHeader from './IncidentHeader';

export default async function IncidentsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <IncidentHeader />
      </div>
      
      <Card>
        <CardContent className="pt-6">
          <IncidentManager />
        </CardContent>
      </Card>
    </div>
  );
}
