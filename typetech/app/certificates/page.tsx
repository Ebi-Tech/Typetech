// 'use client'

// import { useState, useEffect } from 'react'
// import { useStudents } from '@/hooks/useStudents'
// import { CohortSelector } from '@/components/cohorts/CohortSelector'
// import { Button } from '@/components/ui/Button'
// import { Card } from '@/components/ui/Card'
// import { Select, SelectItem } from '@/components/ui/Select'
// import { Badge } from '@/components/ui/Badge'
// import { Download, Mail, CheckCircle, Eye, Upload } from 'lucide-react'
// import { PDFDocument, rgb } from 'pdf-lib'
// import { supabase } from '@/lib/supabase'
// import toast from 'react-hot-toast'

'use client'

export default function CertificatesPage() {
  return <div>Test</div>
}

// export default function CertificatesPage() {
//   const { students, refresh } = useStudents()
//    // Use refresh instead of mutate
  
//    const [selectedStudents, setSelectedStudents] = useState<string[]>([])
//   const [generating, setGenerating] = useState(false)
//   const [sending, setSending] = useState(false)
//   const [filter, setFilter] = useState('all')
//   const [selectedCohort, setSelectedCohort] = useState<string | null>(null)
//   const [certificateStatus, setCertificateStatus] = useState<Record<string, any>>({})

//   // Filter students who are eligible for certificates (Complete or Pass)
//   const eligibleStudents = students?.filter(s => 
//     s.final_status === 'Complete' || s.final_status === 'Pass'
//   ) || []

//   // Apply cohort filter
//   const filteredStudents = eligibleStudents.filter(student => {
//     if (selectedCohort && student.cohort_id !== selectedCohort) return false
//     if (filter === 'all') return true
//     if (filter === 'complete') return student.final_status === 'Complete'
//     if (filter === 'pass') return student.final_status === 'Pass'
//     return true
//   })

//   // Load certificate status for students
//   useEffect(() => {
//     const loadCertificateStatus = async () => {
//       if (filteredStudents.length === 0) return
      
//       const { data } = await supabase
//         .from('certificates')
//         .select('*')
//         .in('student_id', filteredStudents.map(s => s.id))

//       if (data) {
//         const statusMap: Record<string, any> = {}
//         data.forEach(cert => {
//           statusMap[cert.student_id] = cert
//         })
//         setCertificateStatus(statusMap)
//       }
//     }

//     loadCertificateStatus()
//   }, [filteredStudents])

//   const toggleStudent = (studentId: string) => {
//     setSelectedStudents(prev =>
//       prev.includes(studentId)
//         ? prev.filter(id => id !== studentId)
//         : [...prev, studentId]
//     )
//   }

//   const toggleAll = () => {
//     if (selectedStudents.length === filteredStudents.length) {
//       setSelectedStudents([])
//     } else {
//       setSelectedStudents(filteredStudents.map(s => s.id))
//     }
//   }

//   const generateCertificate = async (studentId: string, studentName: string) => {
//     try {
//       // Create a new PDF document
//       const pdfDoc = await PDFDocument.create()
//       const page = pdfDoc.addPage([600, 400])
      
//       // Add a border
//       page.drawRectangle({
//         x: 20,
//         y: 20,
//         width: 560,
//         height: 360,
//         borderColor: rgb(0.2, 0.4, 0.8),
//         borderWidth: 2,
//       })
      
//       // Add title
//       page.drawText('Certificate of Completion', {
//         x: 150,
//         y: 300,
//         size: 24,
//         color: rgb(0, 0, 0.5),
//       })
      
//       // Add student name
//       page.drawText(studentName, {
//         x: 250,
//         y: 200,
//         size: 20,
//         color: rgb(0, 0, 0),
//       })
      
//       // Add course name
//       page.drawText('Typing Class', {
//         x: 260,
//         y: 160,
//         size: 16,
//         color: rgb(0.3, 0.3, 0.3),
//       })
      
//       // Add date
//       const date = new Date().toLocaleDateString()
//       page.drawText(`Date: ${date}`, {
//         x: 240,
//         y: 100,
//         size: 12,
//         color: rgb(0.5, 0.5, 0.5),
//       })
      
//       // Save the PDF - FIXED: Convert Uint8Array to Blob properly
//       const pdfBytes = await pdfDoc.save()
  
//       const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' })
      
//       // Upload to Supabase Storage
//       const fileName = `${studentName.replace(/\s+/g, '_')}_Certificate.pdf`
//       const { error } = await supabase.storage
//         .from('certificates')
//         .upload(`${studentId}/${fileName}`, pdfBlob, {
//           contentType: 'application/pdf',
//           upsert: true
//         })
      
//       if (error) throw error
      
//       // Get public URL
//       const { data: urlData } = supabase.storage
//         .from('certificates')
//         .getPublicUrl(`${studentId}/${fileName}`)
      
//       // Save certificate record
//       const { error: dbError } = await supabase
//         .from('certificates')
//         .upsert({
//           student_id: studentId,
//           certificate_url: urlData.publicUrl,
//           generated_at: new Date().toISOString(),
//           email_sent: false,
//           email_attempts: 0
//         })
      
//       if (dbError) throw dbError
      
//       // Update local state
//       setCertificateStatus(prev => ({
//         ...prev,
//         [studentId]: {
//           certificate_url: urlData.publicUrl,
//           generated_at: new Date().toISOString(),
//           email_sent: false
//         }
//       }))
      
//       return urlData.publicUrl
//     } catch (error) {
//       console.error('Error generating certificate:', error)
//       throw error
//     }
//   }

//   const handleGenerateSelected = async () => {
//     if (selectedStudents.length === 0) {
//       toast.error('Select at least one student')
//       return
//     }

//     setGenerating(true)
//     let success = 0
//     let failed = 0

//     for (const studentId of selectedStudents) {
//       const student = students?.find(s => s.id === studentId)
//       if (!student) continue

//       try {
//         await generateCertificate(studentId, student.name)
//         success++
//       } catch (error) {
//         failed++
//       }
//     }

//     await refresh() // Use refresh instead of mutate
//     toast.success(`Generated ${success} certificates${failed > 0 ? `, ${failed} failed` : ''}`)
//     setGenerating(false)
//   }

//   const handleSendEmails = async () => {
//     if (selectedStudents.length === 0) {
//       toast.error('Select at least one student')
//       return
//     }

//     setSending(true)
//     let success = 0
//     let failed = 0

//     for (const studentId of selectedStudents) {
//       const student = students?.find(s => s.id === studentId)
//       if (!student) continue

//       try {
//         // Get certificate URL
//         const cert = certificateStatus[studentId]
//         if (!cert?.certificate_url) {
//           throw new Error('Certificate not found')
//         }

//         // Log email attempt
//         const { error: logError } = await supabase
//           .from('email_logs')
//           .insert([{
//             student_id: studentId,
//             email_type: 'certificate',
//             recipient_email: student.email,
//             subject: 'Your Typing Class Certificate',
//             status: 'sent',
//             metadata: { certificate_url: cert.certificate_url }
//           }])

//         if (logError) throw logError

//         // Update certificate record
//         await supabase
//           .from('certificates')
//           .update({ 
//             email_sent: true, 
//             email_sent_at: new Date().toISOString(),
//             email_attempts: (cert.email_attempts || 0) + 1
//           })
//           .eq('student_id', studentId)

//         // Update student record
//         await supabase
//           .from('students')
//           .update({ 
//             certificate_emailed: true, 
//             certificate_emailed_at: new Date().toISOString() 
//           })
//           .eq('id', studentId)

//         success++
        
//         // Simulate email sending
//         await new Promise(resolve => setTimeout(resolve, 100))
        
//       } catch (error) {
//         failed++
//         // Log failed attempt
//         await supabase
//           .from('email_logs')
//           .insert([{
//             student_id: studentId,
//             email_type: 'certificate',
//             recipient_email: student.email,
//             status: 'failed',
//             error_message: error instanceof Error ? error.message : 'Unknown error'
//           }])
//       }
//     }

//     await refresh() // Use refresh instead of mutate
//     toast.success(`Sent ${success} emails${failed > 0 ? `, ${failed} failed` : ''}`)
//     setSending(false)
//   }

//   const handleDownload = async (studentId: string, studentName: string) => {
//     try {
//       const cert = certificateStatus[studentId]
//       if (cert?.certificate_url) {
//         window.open(cert.certificate_url, '_blank')
//       } else {
//         // Generate if not exists
//         const url = await generateCertificate(studentId, studentName)
//         window.open(url, '_blank')
//       }
//     } catch (error) {
//       toast.error('Failed to download certificate')
//     }
//   }

//   const getStatusBadge = (studentId: string) => {
//     const cert = certificateStatus[studentId]
//     if (!cert) return <Badge variant="secondary">Not Generated</Badge>
//     if (cert.email_sent) return <Badge variant="success">Emailed</Badge>
//     return <Badge variant="warning">Generated</Badge>
//   }

//   return (
//     <div className="space-y-6">
//       <div className="flex items-center justify-between">
//         <h1 className="text-2xl font-bold">Certificates</h1>
//         <div className="flex gap-2">
//           <Button 
//             variant="outline"
//             onClick={() => document.getElementById('template-upload')?.click()}
//           >
//             <Upload size={16} className="mr-2" />
//             Upload Template
//           </Button>
//           <input
//             id="template-upload"
//             type="file"
//             accept=".pdf"
//             className="hidden"
//             onChange={(e) => {
//               toast.success('Template uploaded (demo)')
//             }}
//           />
//         </div>
//       </div>

//       {/* Filters */}
//       <div className="flex items-center gap-4">
//         <CohortSelector 
//           selectedCohort={selectedCohort}
//           onCohortChange={setSelectedCohort}
//         />
//         <Select value={filter} onValueChange={setFilter}>
//           <SelectItem value="all">All Eligible</SelectItem>
//           <SelectItem value="complete">Complete Only</SelectItem>
//           <SelectItem value="pass">Pass Only</SelectItem>
//         </Select>
//       </div>

//       {/* Stats */}
//       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//         <Card className="p-4">
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm text-gray-600">Eligible Students</p>
//               <p className="text-2xl font-bold">{filteredStudents.length}</p>
//             </div>
//             <Badge variant="success">Ready</Badge>
//           </div>
//         </Card>
        
//         <Card className="p-4">
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm text-gray-600">Certificates Generated</p>
//               <p className="text-2xl font-bold">
//                 {Object.values(certificateStatus).filter(c => c?.certificate_url).length}
//               </p>
//             </div>
//             <CheckCircle className="text-green-500" size={24} />
//           </div>
//         </Card>
        
//         <Card className="p-4">
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm text-gray-600">Emails Sent</p>
//               <p className="text-2xl font-bold">
//                 {Object.values(certificateStatus).filter(c => c?.email_sent).length}
//               </p>
//             </div>
//             <Mail className="text-blue-500" size={24} />
//           </div>
//         </Card>

//         <Card className="p-4">
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm text-gray-600">Selected</p>
//               <p className="text-2xl font-bold">{selectedStudents.length}</p>
//             </div>
//             <Button
//               variant="outline"
//               size="sm"
//               onClick={toggleAll}
//             >
//               {selectedStudents.length === filteredStudents.length ? 'Deselect All' : 'Select All'}
//             </Button>
//           </div>
//         </Card>
//       </div>

//       {/* Actions */}
//       <div className="flex items-center justify-end gap-2">
//         <Button
//           onClick={handleGenerateSelected}
//           disabled={generating || selectedStudents.length === 0}
//         >
//           <Download size={16} className="mr-2" />
//           {generating ? 'Generating...' : 'Generate Selected'}
//         </Button>
//         <Button
//           onClick={handleSendEmails}
//           disabled={sending || selectedStudents.length === 0}
//         >
//           <Mail size={16} className="mr-2" />
//           {sending ? 'Sending...' : 'Email Selected'}
//         </Button>
//       </div>

//       {/* Students List */}
//       <Card className="overflow-hidden">
//         <div className="overflow-x-auto">
//           <table className="w-full">
//             <thead className="bg-gray-50">
//               <tr>
//                 <th className="px-4 py-3 w-10">
//                   <input
//                     type="checkbox"
//                     checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
//                     onChange={toggleAll}
//                     className="rounded border-gray-300"
//                   />
//                 </th>
//                 <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
//                 <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
//                 <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cohort</th>
//                 <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Certificate</th>
//                 <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
//                 <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
//               </tr>
//             </thead>
//             <tbody className="bg-white divide-y divide-gray-200">
//               {filteredStudents.map((student) => (
//                 <tr key={student.id} className="hover:bg-gray-50">
//                   <td className="px-4 py-3">
//                     <input
//                       type="checkbox"
//                       checked={selectedStudents.includes(student.id)}
//                       onChange={() => toggleStudent(student.id)}
//                       className="rounded border-gray-300"
//                     />
//                   </td>
//                   <td className="px-4 py-3">
//                     <div>
//                       <div className="font-medium">{student.name}</div>
//                       <div className="text-sm text-gray-500">{student.email}</div>
//                     </div>
//                   </td>
//                   <td className="px-4 py-3">
//                     <Badge variant={student.final_status === 'Complete' ? 'success' : 'warning'}>
//                       {student.final_status}
//                     </Badge>
//                   </td>
//                   <td className="px-4 py-3">
//                     <Badge variant="secondary">{student.cohort_id ? 'Cohort' : '—'}</Badge>
//                   </td>
//                   <td className="px-4 py-3">
//                     {getStatusBadge(student.id)}
//                   </td>
//                   <td className="px-4 py-3">
//                     {certificateStatus[student.id]?.email_sent ? (
//                       <Badge variant="success">Sent</Badge>
//                     ) : certificateStatus[student.id]?.certificate_url ? (
//                       <Badge variant="warning">Pending</Badge>
//                     ) : (
//                       <Badge variant="secondary">—</Badge>
//                     )}
//                   </td>
//                   <td className="px-4 py-3">
//                     <div className="flex gap-2">
//                       <Button
//                         size="sm"
//                         variant="ghost"
//                         onClick={() => handleDownload(student.id, student.name)}
//                         title="View/Download Certificate"
//                       >
//                         <Eye size={16} />
//                       </Button>
//                       {certificateStatus[student.id]?.email_attempts > 0 && (
//                         <Badge variant="secondary" className="text-xs">
//                           {certificateStatus[student.id].email_attempts} attempts
//                         </Badge>
//                       )}
//                     </div>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       </Card>
//     </div>
//   )
// }
