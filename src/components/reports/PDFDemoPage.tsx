'use client'

import React, { useState } from 'react'
import { ReportPreview, ReportData } from './ReportPreview'
import { ReportPDFModal } from './ReportPDFModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  FileText, 
  Download, 
  Eye, 
  Users, 
  Zap,
  CheckCircle,
  Clock,
  Star
} from 'lucide-react'

// Sample report data for demonstration
const generateSampleReport = (id: number): ReportData => ({
  id: `demo-${id}`,
  report_number: `CTR${10000 + id}`,
  work_order: `WO${2000 + id * 100}`,
  customer: id === 1 ? 'ELGAS - Paul Lohan' : id === 2 ? 'BOC Limited - Operations' : 'Kleenheat Gas - Brisbane',
  address: {
    street: id === 1 ? '123 Industrial Drive' : id === 2 ? '456 Manufacturing Road' : '789 Business Park',
    suburb: id === 1 ? 'Coronet Bay' : id === 2 ? 'Port Melbourne' : 'Eagle Farm',
    state: id === 1 ? 'VIC' : id === 2 ? 'VIC' : 'QLD',
    postcode: id === 1 ? '3984' : id === 2 ? '3207' : '4009'
  },
  cylinder_gas_type: id === 1 ? 'LPG' : id === 2 ? 'Oxygen' : 'Acetylene',
  gas_supplier: id === 1 ? 'ELGAS' : id === 2 ? 'BOC' : 'Kleenheat',
  size: id === 1 ? '45kg' : id === 2 ? '47L' : '40L',
  test_date: new Date(2024, 5, 26 + id).toISOString(),
  tester_names: ['John Smith', 'Sarah Wilson'],
  vehicle_id: `VH${100 + id}`,
  approved_signatory: 'Damien Perrins',
  approved_signatory_signature: 'damien_perrins.png',
  cylinder_data: Array.from({ length: 5 + id }, (_, index) => ({
    cylinderNo: `CYL${(id * 1000) + index + 1}`,
    cylinderSpec: id === 1 ? 'AS2030.1' : 'AS2030.2',
    wc: `${15 + index}.${5 + index}`,
    extExam: index % 4 === 0 ? 'FAIL' : 'PASS',
    intExam: index % 5 === 0 ? 'FAIL' : 'PASS',
    barcode: `BC${String(id * 10000 + index + 1).padStart(8, '0')}`,
    remarks: index % 3 === 0 ? 'Minor surface scratches' : index % 4 === 0 ? 'Valve replaced' : '-',
    recordedBy: index % 2 === 0 ? 'John Smith' : 'Sarah Wilson'
  })),
  created_at: new Date(2024, 5, 20 + id).toISOString(),
  status: id === 1 ? 'approved' : id === 2 ? 'pending' : 'draft'
})

export function PDFDemoPage() {
  const [showPDFModal, setShowPDFModal] = useState(false)
  const [selectedReport, setSelectedReport] = useState<ReportData | null>(null)
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [selectedTab, setSelectedTab] = useState('preview')

  // Generate sample reports
  const sampleReports = [1, 2, 3].map(generateSampleReport)
  const mainReport = sampleReports[0]

  const features = [
    {
      title: 'Perfect A4 Layout',
      description: 'Pixel-perfect reports that look exactly like the original design',
      icon: FileText,
      highlight: true
    },
    {
      title: 'Multiple Export Formats',
      description: 'PDF (Native & Canvas), PNG, and JPG export options',
      icon: Download,
      highlight: false
    },
    {
      title: 'Print Preview',
      description: 'Interactive preview with zoom controls and print optimization',
      icon: Eye,
      highlight: false
    },
    {
      title: 'Batch Generation',
      description: 'Generate multiple PDFs at once with progress tracking',
      icon: Users,
      highlight: false
    },
    {
      title: 'Professional Quality',
      description: 'High-resolution output with proper fonts and spacing',
      icon: Star,
      highlight: true
    },
    {
      title: 'Browser Native',
      description: 'Uses modern browser print engine for best results',
      icon: Zap,
      highlight: false
    }
  ]

  const handleOpenPDF = (report: ReportData) => {
    setSelectedReport(report)
    setShowPDFModal(true)
  }

  const handleBatchGeneration = () => {
    setSelectedReport(null)
    setShowBatchModal(true)
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <FileText className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">PDF Generation System</h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Professional-grade report PDF generation with modern features and perfect A4 formatting
        </p>
        <div className="flex items-center justify-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Production Ready
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Modern Browser Support
          </Badge>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature, index) => (
          <Card key={`feature-${index}`} className={feature.highlight ? 'ring-2 ring-primary/20' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <feature.icon className={`h-5 w-5 ${feature.highlight ? 'text-primary' : 'text-muted-foreground'}`} />
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>{feature.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Demo Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Live Demo
          </CardTitle>
          <CardDescription>
            Interact with the PDF generation system using sample report data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="preview">Report Preview</TabsTrigger>
              <TabsTrigger value="single">Single Export</TabsTrigger>
              <TabsTrigger value="batch">Batch Generation</TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="space-y-6 mt-6">
              <div className="text-center space-y-4">
                <h3 className="text-lg font-semibold">Report Preview</h3>
                <p className="text-muted-foreground">
                  This is how your reports will look when exported to PDF
                </p>
              </div>
              
              <div className="max-w-5xl mx-auto">
                <div className="transform scale-50 origin-top">
                  <ReportPreview data={mainReport} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="single" className="space-y-6 mt-6">
              <div className="text-center space-y-4">
                <h3 className="text-lg font-semibold">Single Report Export</h3>
                <p className="text-muted-foreground">
                  Generate PDFs for individual reports with full customization options
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {sampleReports.map((report) => (
                  <Card key={report.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">{report.report_number}</CardTitle>
                      <CardDescription>{report.customer}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Work Order:</span>
                        <span className="font-medium">{report.work_order}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Cylinders:</span>
                        <span className="font-medium">{report.cylinder_data.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant={report.status === 'approved' ? 'default' : report.status === 'pending' ? 'secondary' : 'outline'}>
                          {report.status}
                        </Badge>
                      </div>
                      <Button 
                        onClick={() => handleOpenPDF(report)} 
                        className="w-full mt-4"
                        size="sm"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Export PDF
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="batch" className="space-y-6 mt-6">
              <div className="text-center space-y-4">
                <h3 className="text-lg font-semibold">Batch PDF Generation</h3>
                <p className="text-muted-foreground">
                  Generate multiple PDF reports simultaneously with progress tracking
                </p>
              </div>

              <Card className="max-w-2xl mx-auto">
                <CardHeader className="text-center">
                  <CardTitle className="flex items-center justify-center gap-2">
                    <Users className="h-5 w-5" />
                    Batch Export Demo
                  </CardTitle>
                  <CardDescription>
                    Export all {sampleReports.length} sample reports as separate PDF files
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {sampleReports.map((report) => (
                      <div key={report.id} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                        <span className="text-sm font-medium">{report.report_number}</span>
                        <span className="text-sm text-muted-foreground">{report.customer}</span>
                        <Badge variant="outline" className="text-xs">
                          {report.cylinder_data.length} cylinders
                        </Badge>
                      </div>
                    ))}
                  </div>
                  
                  <Button onClick={handleBatchGeneration} className="w-full" size="lg">
                    <Download className="h-5 w-5 mr-2" />
                    Generate All PDFs
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Technical Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Technical Features
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-semibold">PDF Generation Methods</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• <strong>Native Browser Print:</strong> High-quality PDF using browser&apos;s print engine (recommended)</li>
              <li>• <strong>Canvas-based:</strong> HTML to Canvas to PDF conversion (fallback)</li>
              <li>• <strong>Image Export:</strong> PNG and JPG format support</li>
            </ul>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-semibold">Quality Options</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• <strong>Standard:</strong> Fast generation, good quality</li>
              <li>• <strong>High:</strong> Balanced quality and speed (recommended)</li>
              <li>• <strong>Ultra:</strong> Maximum quality, slower generation</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* PDF Modal */}
      <ReportPDFModal
        open={showPDFModal}
        onOpenChange={setShowPDFModal}
        reportData={selectedReport}
        showEmailOption={true}
      />

      {/* Batch PDF Modal */}
      <ReportPDFModal
        open={showBatchModal}
        onOpenChange={setShowBatchModal}
        reportData={null}
        batchReports={sampleReports}
      />
    </div>
  )
} 