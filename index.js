const mqtt = require('mqtt');

const MQTT_HOST = process.env.MQTT_HOST || 'localhost';
const MQTT_PORT = process.env.MQTT_PORT || 1883;
const MQTT_USER = process.env.MQTT_USER || 'bridge';
const MQTT_PASS = process.env.MQTT_PASS || 'kab000000';
const BASE44_WEBHOOK = process.env.BASE44_WEBHOOK;
const BRIDGE_SECRET = process.env.BRIDGE_SECRET || '';

const client = mqtt.connect(`mqtt://${MQTT_HOST}:${MQTT_PORT}`, {
  clientId: 'printer_bridge_' + Math.random().toString(16).slice(2),
  username: MQTT_USER,
  password: MQTT_PASS,
  clean: true,
  reconnectPeriod: 5000,
});

client.on('connect', () => {
  console.log('[Bridge] Connected to EMQX broker');
  client.subscribe('printer/+/update', { qos: 1 });
  console.log('[Bridge] Subscribed to printer/+/update');
});

client.on('message', async (topic, message) => {
  console.log('[Bridge] Message on', topic, ':', message.toString());
  if (!BASE44_WEBHOOK) return;
  try {
    const { fetch } = await import('node-fetch');
    await fetch(BASE44_WEBHOOK, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bridge-secret': BRIDGE_SECRET,
      },
      body: JSON.stringify({ topic, payload: JSON.parse(message.toString()) }),
    });
    console.log('[Bridge] Forwarded to Base44');
  } catch (err) {
    console.error('[Bridge] Error forwarding:', err.message);
  }
});

client.on('error', (err) => console.error('[Bridge] MQTT error:', err.message));
client.on('reconnect', () => console.log('[Bridge] Reconnecting...'));
console.log('[Bridge] Starting...');
