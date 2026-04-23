import { query, getMany } from "../../../lib/db";
import { requireStaff } from "../../../lib/auth";

export async function GET(req) {
  try {
    const { profile } = await requireStaff(req);

    const patients = await getMany(
      `
      select *
      from patients
      where salon_id = $1
      order by created_at desc
      `,
      [profile.salon_id]
    );

    return Response.json({ patients });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 401
    });
  }
}

export async function POST(req) {
  try {
    const { profile } = await requireStaff(req);
    const body = await req.json();

    const {
      name,
      phone,
      email,
      date_of_birth,
      insurance_type,
      case_reference,
      notes,
      consent_given
    } = body;

    if (!name) {
      return new Response(
        JSON.stringify({ error: "Name required" }),
        { status: 400 }
      );
    }

    const result = await query(
      `
      insert into patients (
        salon_id,
        name,
        phone,
        email,
        date_of_birth,
        insurance_type,
        case_reference,
        notes,
        consent_given,
        consent_date
      )
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9, now())
      returning *
      `,
      [
        profile.salon_id,
        name,
        phone || null,
        email || null,
        date_of_birth || null,
        insurance_type || null,
        case_reference || null,
        notes || null,
        consent_given || false
      ]
    );

    return Response.json({
      success: true,
      patient: result.rows[0]
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400
    });
  }
}
