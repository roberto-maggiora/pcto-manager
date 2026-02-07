import { Card } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";

export default function ExportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Export</h1>
        <p className="text-slate-600">Elenco export generati</p>
      </div>
      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Tipo</Th>
              <Th>Data</Th>
              <Th>Download</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td>Registro Presenze</Td>
              <Td>10/02/2026 12:00</Td>
              <Td>Scarica</Td>
            </tr>
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
