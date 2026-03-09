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

    // Unassign all students in this cohort first
    const { error: unassignError } = await supabaseAdmin
      .from('students')
      .update({ cohort_id: null })
      .eq('cohort_id', cohortId)

    if (unassignError) throw unassignError

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
