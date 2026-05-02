/**
 * Client-side PDF export.
 * Uses jsPDF — small, no server-side dependency.
 */

import { jsPDF } from 'jspdf';
import type { Pattern, Geometry, Language } from '@/engine/types';
import { formatPattern } from '@/engine/translator';
import { t } from './i18n';

export async function exportPatternToPDF(
  pattern: Pattern,
  geometry: Geometry,
  language: Language = 'es',
): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 20;
  const pageWidth = 210;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(pattern.metadata.name, margin, y);
  y += 8;

  if (pattern.metadata.designer) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(120);
    doc.text(`${language === 'es' ? 'Diseño de' : 'Design by'} ${pattern.metadata.designer}`, margin, y);
    y += 6;
  }
  doc.setTextColor(0);
  y += 4;

  // Materials box
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(t('materials', language), margin, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  const materialLines = [
    `${t('yarn', language)}: CYC ${pattern.materials.yarnCyc}`,
    `${t('hook', language)}: ${pattern.materials.hookMm} mm`,
    `${t('size', language)}: ${geometry.estimatedSize.width.toFixed(1)} × ${geometry.estimatedSize.height.toFixed(1)} cm`,
    `${t('yarn_needed', language)}: ${geometry.estimatedYarnGrams} g`,
  ];
  for (const line of materialLines) {
    doc.text(line, margin, y);
    y += 5;
  }
  y += 4;

  // Pattern body
  const formattedPattern = formatPattern(pattern, { language });
  const lines = doc.splitTextToSize(formattedPattern, contentWidth);
  doc.setFontSize(9);
  doc.setFont('courier', 'normal');

  for (const line of lines) {
    if (y > 280) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += 4;
  }

  // Footer
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(
    `Achis de Amor · ${new Date().toLocaleDateString(language === 'es' ? 'es-AR' : 'en-US')}`,
    margin,
    287,
  );

  doc.save(`${slugify(pattern.metadata.name)}.pdf`);
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'pattern';
}
