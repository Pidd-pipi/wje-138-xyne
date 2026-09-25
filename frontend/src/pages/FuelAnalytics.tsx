import { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { Button, Card, Input, Modal, Statistic, Table, Tabs, message } from 'antd';
import { fuelApi } from '../api/fuel';
import { FuelAlertStatus, type FuelAlert, type FuelRecord } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { formatFuelConsumption } from '../utils/formatFuelConsumption';
import { PageShell } from './PageShell';
export function FuelAnalytics() {
  const [records, setRecords] = useState<FuelRecord[]>([]);
  const [alerts, setAlerts] = useState<FuelAlert[]>([]);
  const [closing, setClosing] = useState<FuelAlert | null>(null);
  const [reason, setReason] = useState('');
  const loadAlerts = () => fuelApi.listAlerts().then(setAlerts).catch(() => setAlerts([]));
  useEffect(() => { fuelApi.list().then(setRecords).catch(() => setRecords([])); loadAlerts(); }, []);
  const submitClose = () => {
    if (!closing || !reason.trim()) return;
    fuelApi.closeAlert(closing.id, reason.trim()).then(() => { message.success(`预警 ${closing.alertNo} 已关闭`); setClosing(null); setReason(''); loadAlerts(); }).catch(() => message.error('关闭失败，请重试'));
  };
  const columns = [
    { title: '编号', dataIndex: 'alertNo' },
    { title: '车辆', dataIndex: 'plateNo' },
    { title: '加油区间', render: (_: unknown, alert: FuelAlert) => `${alert.prevRecord.date} → ${alert.currRecord.date}（${alert.currRecord.mileage - alert.prevRecord.mileage} km）` },
    { title: '实测油耗', render: (_: unknown, alert: FuelAlert) => formatFuelConsumption(alert.segmentConsumption) },
    { title: '档案油耗', render: (_: unknown, alert: FuelAlert) => formatFuelConsumption(alert.baselineConsumption) },
    { title: '增幅', render: (_: unknown, alert: FuelAlert) => <span style={{ color: '#cf1322' }}>+{alert.increasePct}%</span> },
    { title: '状态', render: (_: unknown, alert: FuelAlert) => <StatusBadge status={alert.status} /> },
    { title: '核查原因', dataIndex: 'reason', render: (value: string) => value || '—' },
    { title: '操作', render: (_: unknown, alert: FuelAlert) => alert.status === FuelAlertStatus.Pending && <Button size="small" danger onClick={() => { setClosing(alert); setReason(''); }}>填写原因并关闭</Button> },
  ];
  const renderTable = (status: FuelAlertStatus) => <Table rowKey="id" size="small" pagination={false} columns={columns} dataSource={alerts.filter((alert) => alert.status === status)} />;
  const pending = alerts.filter((alert) => alert.status === FuelAlertStatus.Pending);
  const closed = alerts.filter((alert) => alert.status === FuelAlertStatus.Closed);
  return <PageShell title="油耗分析"><div className="grid grid-2"><Card><Statistic title="月度总油耗" value={records.reduce((sum, item) => sum + item.liters, 0)} suffix="L" /></Card><Card><ReactECharts style={{ height: 320 }} option={{ xAxis: { type: 'category', data: records.map(r => r.date) }, yAxis: { type: 'value' }, series: [{ type: 'line', data: records.map(r => r.totalAmount), smooth: true }] }} /></Card></div><Card title="异常油耗预警" style={{ marginTop: 16 }}><Tabs items={[{ key: 'pending', label: `待核查 (${pending.length})`, children: renderTable(FuelAlertStatus.Pending) }, { key: 'closed', label: `已关闭 (${closed.length})`, children: renderTable(FuelAlertStatus.Closed) }]} /></Card><Modal open={!!closing} title={`关闭预警 ${closing?.alertNo ?? ''}`} onOk={submitClose} onCancel={() => setClosing(null)} okText="关闭预警" okButtonProps={{ disabled: !reason.trim() }}><p>{closing ? `${closing.plateNo} 实测 ${formatFuelConsumption(closing.segmentConsumption)}，较档案油耗 +${closing.increasePct}%` : ''}</p><Input.TextArea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="请填写核查原因，留档后关闭" /></Modal></PageShell>;
}
