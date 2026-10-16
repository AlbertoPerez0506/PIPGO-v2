const admin = require('./_firebaseAdmin');
const { sendMessagePush } = require('./_notifyHelpers');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const idToken = (req.headers.authorization || '').replace(/^Bearer\s+/, '');
    const decoded = await admin.auth().verifyIdToken(idToken);
    const senderId = decoded.uid;

    const { conversationId, messageId } = req.body || {};
    if (!conversationId || !messageId) {
      return res.status(400).json({ error: 'Faltan IDs' });
    }

    // Verificación de participación (el helper no la hace)
    const convSnap = await admin.firestore()
      .collection('conversaciones').doc(conversationId).get();
    if (!convSnap.exists) return res.status(404).json({ error: 'No existe' });
    const conv = convSnap.data();
    if (!conv.participantIds.includes(senderId)) {
      return res.status(403).json({ error: 'No participas' });
    }

    const result = await sendMessagePush({ conversationId, messageId });
    return res.status(200).json({ ok: true, ...result });
  } catch (e) {
    console.error('notify-message error', e);
    if (String(e.message).includes('NOT_FOUND')) return res.status(404).json({ error: 'No existe' });
    return res.status(500).json({ error: 'Error interno' });
  }
};