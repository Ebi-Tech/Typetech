import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { cohortId } = await request.json()
    if (!cohortId) {
      return NextResponse.json({ error: 'cohortId is required' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Delete dependent records for all students in this cohort
    const { data: cohortStudents } = await supabaseAdmin
      .from('students')
      .select('id')
      .eq('cohort_id', cohortId)

    const studentIds = (cohortStudents || []).map(s => s.id)

    if (studentIds.length > 0) {
      await supabaseAdmin.from('attendance').delete().in('student_id', studentIds)
      await supabaseAdmin.from('week_data').delete().in('student_id', studentIds)
      await supabaseAdmin.from('certificates').delete().in('student_id', studentIds)
      await supabaseAdmin.from('email_logs').delete().in('student_id', studentIds)
      await supabaseAdmin.from('students').delete().in('id', studentIds)
    }

    // Now delete the cohort
    const { error: deleteError } = await supabaseAdmin
      .from('cohorts')
      .delete()
      .eq('id', cohortId)

    if (deleteError) throw deleteError

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error)
    console.error('Delete cohort error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
