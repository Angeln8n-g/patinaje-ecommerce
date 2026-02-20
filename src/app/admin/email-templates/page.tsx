'use client';

import { EmailTemplateEditor } from '@/components/admin/email-templates/EmailTemplateEditor';

export default function EmailTemplatesPage() {
  return (
    <div className="h-[calc(100vh-4rem)] -m-8">
      <EmailTemplateEditor />
    </div>
  );
}
