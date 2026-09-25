import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { Alert, Badge, Button, Card, Form, Input, Modal, Space, Statistic, Table, Tabs, Tag, message } from 'antd';
import { fuelApi } from '../api/fuel';
import { fuelAlertApi } from '../api/fuelAlert';
import { vehicleApi } from '../api/vehicle';
import { FuelAlertStatus, type FuelAlert, type FuelRecord, type Vehicle } from '../types';
import { formatFuelConsumption } from '../utils/formatFuelConsumption';
import { PageShell } from './PageShell';

const refuelOf = (snapshot: Record<string, unknown>): FuelRecord => snapshot as FuelRecord;

export function FuelAnalytics() {
  const [records, setRecords] = useState<FuelRecord[]>([]);
  const [alerts, setAlerts] = useState<FuelAlert[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [tab, setTab] = useState<FuelAlertStatus>(FuelAlertStatus.Open);
  const [scanning, setScanning] = useState(false);
  const [closingId, setClosingId] = useState<number | null>(null);
  const [closeForm] = Form.useForm<{ reason: string; inspector: string }>();

  const plateMap = useMemo(() => {
    const map = new Map<number, string>();
    vehicles.forEach((v) => map.set(v.id, v.plateNo));
    return map;
  }, [vehicles]);

  const refreshAlerts = useCallback(() => {
    fuelAlertApi.list().then(setAlerts).catch(() => setAlerts([]));
  }, []);

  useEffect(() => {
    fuelApi.list().then(setRecords).catch(() => setRecords([]));
    vehicleApi.list<Vehicle>().then(setVehicles).catch(() => setVehicles([]));
    // 进入页面先按最新加油记录核算，再拉取列表；重复进入不重复生成
    fuelAlertApi.scan().then((created) => {
      if (created.length) message.info(`新增 ${created.length} 条油耗异常待核查`);
      refreshAlerts();
    }).catch(refreshAlerts);
  }, [refreshAlerts]);

  const handleScan = () => {
    setScanning(true);
    fuelAlertApi.scan().then((created) => {
      message.success(created.length ? `发现 ${created.length} 条新异常` : '没有新的油耗异常');
      refreshAlerts();
    }).catch(() => message.error('核查失败，请稍后重试'))
      .finally(() => setScanning(false));
  };

  const submitClose = async (id: number) => {
    const values = await closeForm.validateFields();
    const updated = await fuelAlertApi.close(id, values.reason, values.inspector);
    setAlerts((prev) => prev.map((item) => (item.id === id ? updated : item)));
    setClosingId(null);
    closeForm.resetFields();
    message.success(`#${id} 已关闭`);
  };

  const openCount = alerts.filter((a) => a.status === FuelAlertStatus.Open).length;
  const visibleAlerts = alerts.filter((a) => a.status === tab);

  const columns = [
    { title: '编号', dataIndex: 'id', render: (id: number) => `#${id}`, width: 70 },
    { title: '车辆', dataIndex: 'vehicleId', render: (vehicleId: number) => plateMap.get(vehicleId) ?? `车辆${vehicleId}` },
    {
      title: '两次加油',
      render: (_: unknown, record: FuelAlert) => {
        const prev = refuelOf(record.previousRefuel);
        const curr = refuelOf(record.currentRefuel);
        return <Space direction="vertical" size={0}><span>{prev.date} · {prev.liters}L · {prev.mileage.toLocaleString()}km</span><span>{curr.date} · {curr.liters}L · {curr.mileage.toLocaleString()}km</span></Space>;
      },
    },
    { title: '实测油耗', dataIndex: 'measuredConsumption', render: (v: number) => formatFuelConsumption(v) },
    { title: '档案油耗', dataIndex: 'baselineConsumption', render: (v: number) => formatFuelConsumption(v) },
    { title: '增幅', dataIndex: 'increasePercent', render: (v: number) => <Tag color="red">+{v.toFixed(1)}%</Tag> },
    ...(tab === FuelAlertStatus.Closed ? [
      { title: '核查原因', dataIndex: 'reason' },
      { title: '核查员', dataIndex: 'inspector', render: (v: string) => v || '—' },
      { title: '关闭时间', dataIndex: 'closedAt', render: (v: string | null) => v ? new Date(v).toLocaleString() : '—' },
    ] : [
      {
        title: '操作',
        render: (_: unknown, record: FuelAlert) => (
          <Button type="link" size="small" onClick={() => setClosingId(record.id)}>填写原因并关闭</Button>
        ),
      },
    ]),
  ];

  return (
    <PageShell
      title="油耗分析"
      extra={<Button loading={scanning} onClick={handleScan}>重新核算异常</Button>}
    >
      {openCount > 0 && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message={`当前有 ${openCount} 条油耗异常待核查，超过档案油耗 15%，请核查员按编号填写原因后关闭。`}
        />
      )}
      <div className="grid grid-2">
        <Card><Statistic title="月度总油耗" value={records.reduce((sum, item) => sum + item.liters, 0)} suffix="L" /></Card>
        <Card><ReactECharts style={{ height: 320 }} option={{ xAxis: { type: 'category', data: records.map(r => r.date) }, yAxis: { type: 'value' }, series: [{ type: 'line', data: records.map(r => r.totalAmount), smooth: true }] }} /></Card>
      </div>
      <Card title="异常油耗预警" style={{ marginTop: 16 }}>
        <Tabs
          activeKey={tab}
          onChange={(key) => setTab(key as FuelAlertStatus)}
          items={[
            { key: FuelAlertStatus.Open, label: <Badge count={openCount} size="small" offset={[8, -2]}>待核查</Badge> },
            { key: FuelAlertStatus.Closed, label: '已关闭' },
          ]}
        />
        <Table
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={visibleAlerts}
          pagination={false}
          locale={{ emptyText: tab === FuelAlertStatus.Open ? '暂无待核查异常' : '暂无已关闭记录' }}
        />
      </Card>
      <Modal
        title={`关闭异常核查 #${closingId ?? ''}`}
        open={closingId !== null}
        onOk={() => closingId !== null && submitClose(closingId)}
        onCancel={() => { setClosingId(null); closeForm.resetFields(); }}
        okText="确认关闭"
        cancelText="取消"
        destroyOnHidden
      >
        <Form form={closeForm} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item name="reason" label="核查原因" rules={[{ required: true, whitespace: true, message: '请填写核查原因' }]}>
            <Input.TextArea rows={3} placeholder="如：制冷机长时间运行、路况拥堵导致油耗升高" />
          </Form.Item>
          <Form.Item name="inspector" label="核查员">
            <Input placeholder="核查员姓名（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </PageShell>
  );
}
