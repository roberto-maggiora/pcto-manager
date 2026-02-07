import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function SchoolSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Impostazioni Scuola</h1>
        <p className="text-slate-600">Branding e anagrafica</p>
      </div>

      <Card className="space-y-4">
        <h2 className="text-lg font-medium">Branding PDF</h2>
        <div>
          <label className="text-sm font-medium">Header text</label>
          <Input placeholder="Header PDF" />
        </div>
        <div>
          <label className="text-sm font-medium">Footer text</label>
          <Input placeholder="Footer PDF" />
        </div>
        <div>
          <label className="text-sm font-medium">Primary color</label>
          <Input placeholder="#112233" />
        </div>
        <div>
          <label className="text-sm font-medium">Logo upload</label>
          <Input type="file" name="upload" />
        </div>
        <div className="flex gap-2">
          <Button>Salva</Button>
          <Button variant="secondary">Anteprima PDF header</Button>
        </div>
      </Card>
    </div>
  );
}
