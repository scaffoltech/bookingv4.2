import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { validateClientAccessToken } from '@/lib/client-links';
import { Contact } from '@/types';

function dbRowToContact(row: any): Contact {
  const firstName = row.first_name ?? '';
  const lastName = row.last_name ?? '';
  return {
    id: row.id,
    firstName,
    lastName,
    name: `${firstName} ${lastName}`.trim(),
    email: row.email,
    phone: row.phone || '',
    quotes: [],
    createdAt: new Date(row.created_at),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { contactId: string } }
) {
  try {
    const { contactId } = params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const quoteId = searchParams.get('quoteId');

    if (!token || !quoteId) {
      return NextResponse.json(
        { error: 'Access token and quoteId required' },
        { status: 401 }
      );
    }

    if (!validateClientAccessToken(token, quoteId)) {
      return NextResponse.json(
        { error: 'Invalid or expired access token' },
        { status: 403 }
      );
    }

    const supabase = await createAdminClient();

    // The token only proves access to `quoteId` — verify contactId actually
    // belongs to that quote before returning any contact PII.
    const { data: quoteRow, error: quoteError } = await supabase
      .from('quotes')
      .select('contact_id')
      .eq('id', quoteId)
      .single();

    if (quoteError || !quoteRow || quoteRow.contact_id !== contactId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    const contact = dbRowToContact(data);
    return NextResponse.json({ contact });
  } catch (error) {
    console.error('[Client Contact API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
