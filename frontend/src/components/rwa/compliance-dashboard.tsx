'use client'

import { motion } from 'motion/react'
import { CheckCircle, XCircle, Clock, AlertTriangle, Shield } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

interface ComplianceStats {
  totalAssets: number
  compliantAssets: number
  pendingReview: number
  nonCompliant: number
  kycVerified: number
  amlChecks: number
  recentActivities: Array<{
    id: string
    action: string
    asset: string
    timestamp: Date
    status: 'success' | 'warning' | 'error'
  }>
}

export function ComplianceDashboard({ stats }: { stats: ComplianceStats }) {
  const complianceRate = (stats.compliantAssets / stats.totalAssets) * 100

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Compliant Assets"
          value={stats.compliantAssets}
          total={stats.totalAssets}
          icon={CheckCircle}
          color="green"
          delay={0}
        />
        <StatCard
          title="Pending Review"
          value={stats.pendingReview}
          total={stats.totalAssets}
          icon={Clock}
          color="yellow"
          delay={0.1}
        />
        <StatCard
          title="Non-Compliant"
          value={stats.nonCompliant}
          total={stats.totalAssets}
          icon={XCircle}
          color="red"
          delay={0.2}
        />
        <StatCard
          title="KYC Verified"
          value={stats.kycVerified}
          total={stats.totalAssets}
          icon={CheckCircle}
          color="blue"
          delay={0.3}
        />
      </div>

      {/* Compliance Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Overall Compliance Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold">{complianceRate.toFixed(1)}%</span>
              <Badge variant={complianceRate > 90 ? 'success' : complianceRate > 70 ? 'secondary' : 'destructive'}>
                {complianceRate > 90 ? 'Excellent' : complianceRate > 70 ? 'Good' : 'Needs Attention'}
              </Badge>
            </div>
            <Progress value={complianceRate} className="h-2" />
            <p className="text-sm text-muted-foreground">
              Based on ERC-3643 compliance standards[citation:4]
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Compliance Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.recentActivities.map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-accent"
              >
                <div className="flex items-center gap-3">
                  <StatusIcon status={activity.status} />
                  <div>
                    <p className="font-medium">{activity.action}</p>
                    <p className="text-sm text-muted-foreground">{activity.asset}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {activity.timestamp.toLocaleDateString()}
                </p>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ 
  title, 
  value, 
  total, 
  icon: Icon, 
  color, 
  delay 
}: { 
  title: string
  value: number
  total: number
  icon: any
  color: 'green' | 'yellow' | 'red' | 'blue'
  delay: number
}) {
  const percentage = (value / total) * 100
  const colorClasses: Record<'green' | 'yellow' | 'red' | 'blue', string> = {
    green: 'text-green-600 bg-green-500/10',
    yellow: 'text-yellow-600 bg-yellow-500/10',
    red: 'text-red-600 bg-red-500/10',
    blue: 'text-blue-600 bg-blue-500/10',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-sm text-muted-foreground">of {total}</p>
              </div>
            </div>
            <div className={`p-2 rounded-full ${colorClasses[color]}`}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 1, delay: delay + 0.2 }}
                className={`h-full ${
                  color === 'green' ? 'bg-green-500' :
                  color === 'yellow' ? 'bg-yellow-500' :
                  color === 'red' ? 'bg-red-500' : 'bg-blue-500'
                }`}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function StatusIcon({ status }: { status: 'success' | 'warning' | 'error' }) {
  const Icon = status === 'success' ? CheckCircle : status === 'warning' ? AlertTriangle : XCircle
  const colorClass = status === 'success' ? 'text-green-600' : status === 'warning' ? 'text-yellow-600' : 'text-red-600'
  
  return <Icon className={`h-5 w-5 ${colorClass}`} />
}