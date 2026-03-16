/**
 * Simple Firestore schema validator.
 *
 * Usage:
 *   1) Install dependencies: npm install
 *   2) Place a Firebase Admin service account JSON at ./serviceAccountKey.json
 *   3) Run: node scripts/validate-firestore-schema.js
 *
 * This must be run from the project root.
 */

const admin = require("firebase-admin");
const path = require("path");

const SERVICE_ACCOUNT_PATH = process.env.SERVICE_ACCOUNT_PATH || "./serviceAccountKey.json";

function exitWithError(msg) {
  console.error("\nERROR:\n", msg);
  process.exit(1);
}

const svcPath = path.resolve(process.cwd(), SERVICE_ACCOUNT_PATH);
let serviceAccount;
try {
  serviceAccount = require(svcPath);
} catch (err) {
  exitWithError(
    `Could not load service account key at ${svcPath}. Create one in Firebase Console -> Project Settings -> Service accounts and save it as serviceAccountKey.json.`
  );
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const expectedBookingStatus = ["searching", "accepted", "in-progress", "completed", "cancelled"];
const expectedTripStatus = ["accepted", "in-progress", "completed", "cancelled"];

function isTimestamp(value) {
  return value && value.toDate && typeof value.toDate === "function";
}

function checkField(obj, field, checkFn) {
  if (!(field in obj)) return false;
  try {
    return checkFn(obj[field]);
  } catch {
    return false;
  }
}

async function validateBookings() {
  const snapshot = await db.collection("bookings").get();
  console.log(`\nValidating ${snapshot.size} booking(s)...`);

  let errors = 0;
  snapshot.forEach((doc) => {
    const data = doc.data();
    const missing = [];

    if (!checkField(data, "userId", (v) => typeof v === "string")) missing.push("userId");
    if (!checkField(data, "userPhone", (v) => typeof v === "string")) missing.push("userPhone");
    if (!checkField(data, "patientName", (v) => typeof v === "string")) missing.push("patientName");
    if (!checkField(data, "emergency", (v) => typeof v === "string")) missing.push("emergency");
    if (!checkField(data, "status", (v) => expectedBookingStatus.includes(v))) missing.push("status");
    if (!checkField(data, "requestedAt", isTimestamp)) missing.push("requestedAt");
    if (!checkField(data, "pickupLocation", (v) => v && typeof v.latitude === "number" && typeof v.longitude === "number")) missing.push("pickupLocation");

    if (missing.length) {
      errors += 1;
      console.warn(`- booking/${doc.id} missing: ${missing.join(", ")}`);
    }
  });

  if (errors === 0) {
    console.log("✔ All bookings look good.");
  } else {
    console.log(`⚠️  ${errors} booking(s) need attention.`);
  }
}

async function validateTrips() {
  const snapshot = await db.collection("trips").get();
  console.log(`\nValidating ${snapshot.size} trip(s)...`);

  let errors = 0;
  snapshot.forEach((doc) => {
    const data = doc.data();
    const missing = [];

    if (!checkField(data, "driverId", (v) => typeof v === "string")) missing.push("driverId");
    if (!checkField(data, "userId", (v) => typeof v === "string")) missing.push("userId");
    if (!checkField(data, "userPhone", (v) => typeof v === "string")) missing.push("userPhone");
    if (!checkField(data, "status", (v) => expectedTripStatus.includes(v))) missing.push("status");
    if (!checkField(data, "pickupLocation", (v) => v && typeof v.latitude === "number" && typeof v.longitude === "number")) missing.push("pickupLocation");

    if (missing.length) {
      errors += 1;
      console.warn(`- trips/${doc.id} missing: ${missing.join(", ")}`);
    }
  });

  if (errors === 0) {
    console.log("✔ All trips look good.");
  } else {
    console.log(`⚠️  ${errors} trip(s) need attention.`);
  }
}

async function run() {
  console.log("Running Firestore schema validation...");
  await validateBookings();
  await validateTrips();
  console.log("\nValidation complete.");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
