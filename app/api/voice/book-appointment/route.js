import { query, getOne } from "../../../../lib/db";

export async function POST(req) {
  try {
    const body = await req.json();

    const {
      slug,
      patient_name,
      patient_phone,
      reason,
      requested_datetime,
      urgency
    } = body;

    if (!slug || !patient_name || !requested_datetime) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400 }
      );
    }

    // 1. Get salon
    const salon = await getOne(
      `select * from salons where slug = $1`,
      [slug]
    );

    if (!salon) {
      return new Response(
        JSON.stringify({ error: "Praxis not found" }),
        { status: 404 }
      );
    }

    // 2. Find or create patient
    let patient = await getOne(
      `
      select * from patients
      where salon_id = $1
      and phone = $2
      limit 1
      `,
      [salon.id, patient_phone]
    );

    if (!patient) {
      const created = await query(
        `
        insert into patients (salon_id, name, phone, consent_given, consent_date)
        values ($1,$2,$3,true, now())
        returning *
        `,
        [salon.id, patient_name, patient_phone]
      );

      patient = created.rows[0];
    }

    // 3. Pick first active employee
    const employee = await getOne(
      `
      select * from employees
      where salon_id = $1 and active = true
      limit 1
      `,
      [salon.id]
    );

    if (!employee) {
      return new Response(
        JSON.stringify({ error: "No staff available" }),
        { status: 400 }
      );
    }

    // 4. Basic time handling
    let start = new Date(requested_datetime);
    let end = new Date(start.getTime() + 30 * 60000); // 30 min default

    // 5. Check conflicts → if conflict, push forward 30min
    let tries = 0;

    while (tries < 10) {
      const conflict = await getOne(
        `
        select * from appointments
        where employee_id = $1
        and (
          (start_at <= $2 and end_at > $2)
          or
          (start_at < $3 and end_at >= $3)
        )
        `,
        [employee.id, start, end]
      );

      if (!conflict) break;

      start = new Date(start.getTime() + 30 * 60000);
      end = new Date(end.getTime() + 30 * 60000);
      tries++;
    }

    // 6. Create appointment
    const appointment = await query(
      `
      insert into appointments (
        salon_id,
        employee_id,
        patient_id,
        start_at,
        end_at,
        reason_for_visit,
        urgency_level,
        source,
        status
      )
      values ($1,$2,$3,$4,$5,$6,$7,'voice_agent','confirmed')
      returning *
      `,
      [
        salon.id,
        employee.id,
        patient.id,
        start,
        end,
        reason || null,
        urgency || "normal"
      ]
    );

    return Response.json({
      success: true,
      appointment_id: appointment.rows[0].id,
      confirmed_time: appointment.rows[0].start_at
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500 }
    );
  }
}
