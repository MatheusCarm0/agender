import AcceptInviteClient from './accept-invite-client';

export async function generateStaticParams() {
  return [{ token: 'placeholder' }];
}

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <AcceptInviteClient token={token} />;
}