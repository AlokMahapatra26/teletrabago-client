'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Company {
  companies: {
    id: string;
    name: string;
  };
}

interface CompanySelectorProps {
  companies: Company[];
  selectedCompany: string | null;
  onSelectCompany: (companyId: string) => void;
}

export function CompanySelector({
  companies,
  selectedCompany,
  onSelectCompany,
}: CompanySelectorProps) {
  return (
    <Select value={selectedCompany || ''} onValueChange={onSelectCompany}>
      <SelectTrigger className="w-[250px]">
        <SelectValue placeholder="Select a company" />
      </SelectTrigger>
      <SelectContent>
        {companies.map((company) => (
          <SelectItem key={company.companies.id} value={company.companies.id}>
            {company.companies.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
