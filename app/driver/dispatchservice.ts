import {
collection,
doc,
getDocs,
getDoc,
updateDoc
} from "firebase/firestore";

import { db } from "../../services/firebase";


// =======================================
// HAVERSINE DISTANCE CALCULATION
// =======================================

export const calculateDistance = (
lat1:number,
lon1:number,
lat2:number,
lon2:number
)=>{

const R = 6371;

const dLat = (lat2-lat1) * Math.PI/180;
const dLon = (lon2-lon1) * Math.PI/180;

const a =
Math.sin(dLat/2) * Math.sin(dLat/2) +
Math.cos(lat1*Math.PI/180) *
Math.cos(lat2*Math.PI/180) *
Math.sin(dLon/2) * Math.sin(dLon/2);

const c = 2 * Math.atan2(Math.sqrt(a),Math.sqrt(1-a));

return R*c;

};



// =======================================
// FETCH ONLINE DRIVERS
// =======================================

export const getOnlineDrivers = async()=>{

const snapshot = await getDocs(collection(db,"drivers"));

const drivers:any[] = [];

snapshot.forEach((docItem)=>{

const data:any = docItem.data();

if(
data.online === true &&
data.approved === true &&
data.location
){

drivers.push({
id:docItem.id,
...data
});

}

});

return drivers;

};



// =======================================
// FIND NEAREST DRIVERS
// =======================================

export const findNearestDrivers = async(

userLat:number,
userLng:number,
radius:number = 10

)=>{

const drivers = await getOnlineDrivers();

const nearbyDrivers:any[] = [];

drivers.forEach((driver)=>{

const distance = calculateDistance(

userLat,
userLng,
driver.location.latitude,
driver.location.longitude

);

if(distance <= radius){

nearbyDrivers.push({
...driver,
distance
});

}

});


// SORT BY DISTANCE
nearbyDrivers.sort((a,b)=>a.distance - b.distance);

return nearbyDrivers;

};



// =======================================
// ASSIGN DRIVER REQUEST
// =======================================

export const assignDriverRequest = async(

bookingId:string,
driverId:string

)=>{

await updateDoc(doc(db,"bookings",bookingId),{

assignedDriver:driverId,
status:"driver_requested",
requestTime:Date.now()

});

};



// =======================================
// SMART DISPATCH SYSTEM
// =======================================

export const dispatchAmbulance = async(

bookingId:string,
userLat:number,
userLng:number

)=>{

console.log("🚑 Starting Smart Dispatch...");

const drivers = await findNearestDrivers(
userLat,
userLng,
10
);

if(drivers.length === 0){

console.log("❌ No drivers available");

await updateDoc(doc(db,"bookings",bookingId),{
status:"no_driver_available"
});

return;

}

console.log("Drivers found:",drivers.length);

assignNextDriver(drivers,bookingId,0);

};



// =======================================
// AUTO DRIVER ASSIGNMENT
// =======================================

const assignNextDriver = async(

drivers:any[],
bookingId:string,
index:number

)=>{

if(index >= drivers.length){

console.log("❌ All drivers rejected");

await updateDoc(doc(db,"bookings",bookingId),{
status:"no_driver_available"
});

return;

}

const driver = drivers[index];

console.log("🚑 Sending request to:",driver.id);

await assignDriverRequest(bookingId,driver.id);


// WAIT FOR DRIVER RESPONSE

setTimeout(async()=>{

const bookingRef = doc(db,"bookings",bookingId);

const snap = await getDoc(bookingRef);

if(!snap.exists()) return;

const data:any = snap.data();

if(data.status === "accepted"){

console.log("Driver accepted ride");

return;

}

console.log("Driver timeout → trying next driver");

assignNextDriver(
drivers,
bookingId,
index+1
);

},20000);

};



// =======================================
// DRIVER ACCEPT BOOKING
// =======================================

export const driverAcceptBooking = async(

bookingId:string,
driverId:string

)=>{

await updateDoc(doc(db,"bookings",bookingId),{

status:"accepted",
driverId:driverId,
acceptedTime:Date.now()

});

};



// =======================================
// DRIVER REJECT BOOKING
// =======================================

export const driverRejectBooking = async(

bookingId:string

)=>{

await updateDoc(doc(db,"bookings",bookingId),{

status:"rejected"

});

};



// =======================================
// DRIVER ARRIVED
// =======================================

export const markDriverArrived = async(

bookingId:string

)=>{

await updateDoc(doc(db,"bookings",bookingId),{

status:"driver_arrived"

});

};



// =======================================
// RIDE START
// =======================================

export const startRide = async(

bookingId:string

)=>{

await updateDoc(doc(db,"bookings",bookingId),{

status:"ride_started",
rideStartTime:Date.now()

});

};



// =======================================
// RIDE COMPLETE
// =======================================

export const completeRide = async(

bookingId:string

)=>{

await updateDoc(doc(db,"bookings",bookingId),{

status:"ride_completed",
rideEndTime:Date.now()

});

};