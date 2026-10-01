import Link from "next/link";

import { AIStatusBadge, SentimentBadge, TYPE_LABELS, formatDate } from "@/components/labels";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Interaction } from "@/types";

export function InteractionTable({
  interactions,
  showCustomer = true,
}: {
  interactions: Interaction[];
  showCustomer?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            {showCustomer && <TableHead>Customer</TableHead>}
            <TableHead>Type</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Insight</TableHead>
            <TableHead>Sentiment</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {interactions.map((interaction) => (
            <TableRow key={interaction.id}>
              <TableCell className="font-medium">
                <Link href={`/interactions/${interaction.id}`} className="hover:underline">
                  {interaction.title}
                </Link>
              </TableCell>
              {showCustomer && <TableCell>{interaction.customer.company}</TableCell>}
              <TableCell>{TYPE_LABELS[interaction.type]}</TableCell>
              <TableCell>{formatDate(interaction.occurred_at)}</TableCell>
              <TableCell>
                <AIStatusBadge status={interaction.ai_status} />
              </TableCell>
              <TableCell>
                <SentimentBadge sentiment={interaction.insight?.sentiment ?? null} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
