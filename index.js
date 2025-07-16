const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

admin.initializeApp();
const db = admin.firestore();

const RECAPTCHA_SECRET = 6LfVwYQrAAAAAAvWc3KDy65EvDkn-MwLIrMiZyb3; // Replace with your secret

exports.submitReview = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, review, recaptchaToken } = req.body;
  if (!name || !review || !recaptchaToken) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Verify reCAPTCHA token with Google API
  const verifyURL = `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET}&response=${recaptchaToken}`;

  try {
    const recaptchaRes = await fetch(verifyURL, { method: "POST" });
    const recaptchaJson = await recaptchaRes.json();

    if (!recaptchaJson.success || recaptchaJson.score < 0.5) {
      // score check for reCAPTCHA v3; for v2 just check success
      return res.status(400).json({ error: "reCAPTCHA verification failed" });
    }

    // Save review in Firestore
    await db.collection("reviews").add({
      name,
      review,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({ message: "Review submitted successfully" });
  } catch (error) {
    console.error("Error verifying reCAPTCHA or saving review:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});
