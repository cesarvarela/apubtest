import IncidentManager from './IncidentManager';

export default function IncidentsListPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Incidents</h1>
      <IncidentManager />
    </div>
  );
}