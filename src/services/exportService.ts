import pdfMake from 'pdfmake';
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';

/** Generate a PDF buffer for a case summary */
export const generateCasePdf = async (caseId: string): Promise<Buffer> => {
  const c = await prisma.case.findUnique({
    where: { id: caseId },
    include: { medications: true, tasks: true, members: true },
  });
  if (!c) throw new Error('Case not found');

  const docDef: TDocumentDefinitions = {
    content: [
      { text: `Care Transition Summary – ${c.patientName}`, style: 'header' },
      { text: `DOB: ${c.patientDob.toDateString()}` },
      { text: `Emergency Contact: ${c.emergencyContact}` },
      { text: 'Medications', style: 'subheader' },
      ...c.medications.map((m) => ({
        ul: [
          `${m.name} – ${m.dosage} – ${m.schedule}`,
          `Source: ${m.source ?? 'N/A'}`,
          `Verified: ${m.verifiedAt?.toLocaleDateString() ?? 'No'}`,
          `Notes: ${m.notes ?? ''}`,
        ],
      })),
      { text: 'Tasks', style: 'subheader' },
      ...c.tasks.map((t) => ({
        ul: [
          `${t.title} – ${t.status}`,
          `Owner: ${t.owner?.name ?? 'Unassigned'}`,
          `Due: ${t.dueDate.toLocaleString()}`,
          `Escalation: ${t.escalationLevel}`,
        ],
      })),
    ],
    styles: {
      header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
      subheader: { fontSize: 14, bold: true, margin: [0, 10, 0, 5] },
    },
  };

  const pdfDoc = pdfMake.createPdf(docDef);
  return new Promise<Buffer>((resolve, reject) => {
    pdfDoc.getBuffer((buf) => resolve(Buffer.from(buf)));
  });
};
