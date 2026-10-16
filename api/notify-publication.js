const admin = require('./_firebaseAdmin');
const { sendPublicationPush } = require('./_notifyHelpers');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const idToken = (req.headers.authorization || '').replace(/^Bearer\s+/, '');
    if (!idToken) return res.status(401).json({ error: 'No autorizado' });
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    const { publicationId } = req.body || {};
    if (!publicationId) return res.status(400).json({ error: 'Falta publicationId' });

    // El helper verifica internamente que la publicación exista y esté activa.
    // Aquí solo exigimos que quien invoca sea el dueño.
    const pubSnap = await admin.firestore().collection('publicaciones').doc(publicationId).get();
    if (!pubSnap.exists) return res.status(404).json({ error: 'No existe' });
    if (pubSnap.data().userId !== uid) return res.status(403).json({ error: 'No es tuya' });

    const result = await sendPublicationPush({ publicationId });
    return res.status(200).json({ ok: true, ...result });
  } catch (e) {
    console.error('notify-publication error', e);
    if (String(e.message).includes('NOT_FOUND')) return res.status(404).json({ error: 'No existe' });
    return res.status(500).json({ error: 'Error interno' });
  }
};