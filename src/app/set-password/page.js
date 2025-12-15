import { Suspense } from 'react';
import SetPasswordContent from './SetPasswordContent';

export default function SetPassword() {
  return (
    <Suspense fallback={<p className="text-center py-20">Loading...</p>}>
      <SetPasswordContent />
    </Suspense>
  );
}
