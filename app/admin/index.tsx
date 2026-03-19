import { MaterialIcons } from "@expo/vector-icons";
import { collection, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Booking, Driver } from "../../lib/driverTypes";
import { db } from "../../services/firebase";

export default function AdminPanel() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "drivers" | "bookings">("overview");
  const [bookingFilter, setBookingFilter] = useState<"all" | "searching" | "accepted" | "arrived" | "in-progress" | "completed" | "cancelled">("all");

  // ==============================
  // FETCH DRIVERS
  // ==============================
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "drivers"), (snap) => {
      const driversList: Driver[] = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Driver[];
      setDrivers(driversList);
    });

    return unsubscribe;
  }, []);

  // ==============================
  // FETCH PENDING BOOKINGS
  // ==============================
  useEffect(() => {
    const q = query(
      collection(db, "bookings"),
      where("status", "==", "searching")
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const bookingsList: Booking[] = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Booking[];
      setBookings(bookingsList);
    });

    return unsubscribe;
  }, []);

  // ==============================
  // FETCH ALL BOOKINGS
  // ==============================
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "bookings"), (snap) => {
      const bookingsList: Booking[] = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Booking[];
      setAllBookings(bookingsList);
    });

    return unsubscribe;
  }, []);

  // ==============================
  // APPROVE DRIVER
  // ==============================
  const approveDriver = async (driverId: string) => {
    try {
      await updateDoc(doc(db, "drivers", driverId), {
        approved: true,
      });
      Alert.alert("Success", "Driver approved!");
    } catch (error) {
      console.error("Approve driver error:", error);
      Alert.alert("Error", "Failed to approve driver");
    }
  };

  // ==============================
  // ASSIGN BOOKING TO DRIVER
  // ==============================
  const assignBooking = async (bookingId: string, driverId: string) => {
    try {
      await updateDoc(doc(db, "bookings", bookingId), {
        status: "accepted",
        driverId: driverId,
        assignedBy: "admin",
      });
      Alert.alert("Success", "Booking assigned to driver!");
    } catch (error) {
      console.error("Assign booking error:", error);
      Alert.alert("Error", "Failed to assign booking");
    }
  };

  // ==============================
  // CALCULATE STATISTICS
  // ==============================
  const stats = {
    totalDrivers: drivers.length,
    approvedDrivers: drivers.filter(d => d.approved).length,
    onlineDrivers: drivers.filter(d => d.online).length,
    pendingApprovals: drivers.filter(d => !d.approved).length,
    totalBookings: allBookings.length,
    searchingBookings: allBookings.filter(b => b.status === "searching").length,
    acceptedBookings: allBookings.filter(b => b.status === "accepted").length,
    arrivedBookings: allBookings.filter(b => b.status === "arrived").length,
    inProgressBookings: allBookings.filter(b => b.status === "in-progress").length,
    completedBookings: allBookings.filter(b => b.status === "completed").length,
    cancelledBookings: allBookings.filter(b => b.status === "cancelled").length,
  };

  // ==============================
  // GET FILTERED BOOKINGS
  // ==============================
  const getFilteredBookings = () => {
    if (bookingFilter === "all") return allBookings;
    return allBookings.filter(b => b.status === bookingFilter);
  };

  // ==============================
  // RENDER: OVERVIEW TAB
  // ==============================
  const renderOverview = () => (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      {/* DRIVER STATS */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { borderLeftColor: "#4CAF50" }]}>
          <MaterialIcons name="people" size={32} color="#4CAF50" />
          <Text style={styles.statNumber}>{stats.totalDrivers}</Text>
          <Text style={styles.statLabel}>Total Drivers</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: "#2196F3" }]}>
          <MaterialIcons name="verified" size={32} color="#2196F3" />
          <Text style={styles.statNumber}>{stats.approvedDrivers}</Text>
          <Text style={styles.statLabel}>Approved</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: "#FF9800" }]}>
          <MaterialIcons name="cloud-done" size={32} color="#FF9800" />
          <Text style={styles.statNumber}>{stats.onlineDrivers}</Text>
          <Text style={styles.statLabel}>Online Now</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: "#e53935" }]}>
          <MaterialIcons name="schedule" size={32} color="#e53935" />
          <Text style={styles.statNumber}>{stats.pendingApprovals}</Text>
          <Text style={styles.statLabel}>Pending Review</Text>
        </View>
      </View>

      {/* BOOKING STATS */}
      <Text style={styles.sectionTitle}>📊 Booking Statistics</Text>
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { borderLeftColor: "#FFC107" }]}>
          <MaterialIcons name="search" size={28} color="#FFC107" />
          <Text style={styles.statNumber}>{stats.searchingBookings}</Text>
          <Text style={styles.statLabel}>Searching</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: "#9C27B0" }]}>
          <MaterialIcons name="done" size={28} color="#9C27B0" />
          <Text style={styles.statNumber}>{stats.acceptedBookings}</Text>
          <Text style={styles.statLabel}>Accepted</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: "#00BCD4" }]}>
          <MaterialIcons name="location-on" size={28} color="#00BCD4" />
          <Text style={styles.statNumber}>{stats.arrivedBookings}</Text>
          <Text style={styles.statLabel}>Arrived</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: "#FF5722" }]}>
          <MaterialIcons name="directions-car" size={28} color="#FF5722" />
          <Text style={styles.statNumber}>{stats.inProgressBookings}</Text>
          <Text style={styles.statLabel}>In Progress</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: "#8BC34A" }]}>
          <MaterialIcons name="check-circle" size={28} color="#8BC34A" />
          <Text style={styles.statNumber}>{stats.completedBookings}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: "#9E9E9E" }]}>
          <MaterialIcons name="cancel" size={28} color="#9E9E9E" />
          <Text style={styles.statNumber}>{stats.cancelledBookings}</Text>
          <Text style={styles.statLabel}>Cancelled</Text>
        </View>
      </View>

      {/* PENDING APPROVALS SECTION */}
      {stats.pendingApprovals > 0 && (
        <>
          <Text style={styles.sectionTitle}>⏳ Drivers Pending Approval</Text>
          {drivers.filter(d => !d.approved).map(driver => (
            <View key={driver.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemName}>{driver.name}</Text>
                <MaterialIcons name="schedule" size={20} color="#e53935" />
              </View>
              <Text style={styles.itemDetail}>📱 {driver.phone}</Text>
              <Text style={styles.itemDetail}>🚑 {driver.vehicleNumber || "N/A"}</Text>
              <TouchableOpacity 
                style={styles.approveBtn}
                onPress={() => approveDriver(driver.id)}
              >
                <MaterialIcons name="verified" size={20} color="#fff" />
                <Text style={styles.btnText}>Approve Driver</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );

  // ==============================
  // RENDER: DRIVERS TAB
  // ==============================
  const renderDrivers = () => (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      {drivers.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="person-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>No drivers yet</Text>
        </View>
      ) : (
        drivers.map(driver => (
          <View key={driver.id} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <View>
                <Text style={styles.itemName}>{driver.name}</Text>
                <Text style={styles.itemSubtitle}>
                  {driver.approved ? "✅ Approved" : "⏳ Pending"} • {driver.online ? "🟢 Online" : "🔴 Offline"}
                </Text>
              </View>
              {driver.online && (
                <View style={styles.onlineBadge}>
                  <MaterialIcons name="cloud-done" size={20} color="#fff" />
                </View>
              )}
            </View>
            <View style={styles.itemDetails}>
              <Text style={styles.itemDetail}>📱 {driver.phone}</Text>
              <Text style={styles.itemDetail}>🚑 {driver.vehicleNumber || "N/A"}</Text>
              {driver.currentTripId && <Text style={styles.activeTrip}>🔴 Active Trip</Text>}
            </View>
            {!driver.approved && (
              <TouchableOpacity 
                style={styles.approveBtn}
                onPress={() => approveDriver(driver.id)}
              >
                <MaterialIcons name="verified" size={18} color="#fff" />
                <Text style={styles.btnText}>Approve</Text>
              </TouchableOpacity>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );

  // ==============================
  // RENDER: BOOKINGS TAB
  // ==============================
  const renderBookings = () => (
    <View style={{ flex: 1 }}>
      {/* FILTER BUTTONS */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 16 }}>
          {["all", "searching", "accepted", "arrived", "in-progress", "completed", "cancelled"].map(filter => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterBtn,
                bookingFilter === filter && styles.filterBtnActive
              ]}
              onPress={() => setBookingFilter(filter as any)}
            >
              <Text style={[styles.filterBtnText, bookingFilter === filter && styles.filterBtnTextActive]}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* BOOKINGS LIST */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {getFilteredBookings().length === 0 ? (
          <View style={[styles.emptyState, { marginTop: 60 }]}>
            <MaterialIcons name="info" size={60} color="#ccc" />
            <Text style={styles.emptyText}>No bookings found</Text>
          </View>
        ) : (
          getFilteredBookings().map(booking => (
            <View key={booking.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>👤 {booking.patientName}</Text>
                  <Text style={styles.itemSubtitle}>
                    {booking.status.toUpperCase()}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
                  <Text style={styles.statusBadgeText}>{booking.emergency}</Text>
                </View>
              </View>
              <View style={styles.itemDetails}>
                <Text style={styles.itemDetail}>📍 {booking.pickupLocation ? `${booking.pickupLocation.latitude.toFixed(3)}, ${booking.pickupLocation.longitude.toFixed(3)}` : "Location N/A"}</Text>
                {booking.driverId && <Text style={styles.itemDetail}>🚑 Driver Assigned</Text>}
                {!booking.driverId && booking.status === "searching" && (
                  <View>
                    <Text style={styles.itemDetail}>⚠️ Needs Assignment</Text>
                    <View style={styles.assignmentOptions}>
                      {drivers.filter(d => d.approved && d.online && !d.currentTripId).map(driver => (
                        <TouchableOpacity
                          key={driver.id}
                          style={styles.assignBtn}
                          onPress={() => assignBooking(booking.id, driver.id)}
                        >
                          <Text style={styles.btnText}>{driver.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );

  // ==============================
  // GET STATUS COLOR
  // ==============================
  const getStatusColor = (status: string) => {
    switch (status) {
      case "searching": return "#FFC107";
      case "accepted": return "#9C27B0";
      case "arrived": return "#00BCD4";
      case "in-progress": return "#FF5722";
      case "completed": return "#8BC34A";
      case "cancelled": return "#9E9E9E";
      default: return "#999";
    }
  };

  // ==============================
  // MAIN RENDER
  // ==============================
  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerContainer}>
        <Text style={styles.appTitle}>🚑 Admin Dashboard</Text>
      </View>

      {/* TAB NAVIGATION */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "overview" && styles.tabActive]}
          onPress={() => setActiveTab("overview")}
        >
          <MaterialIcons name="dashboard" size={20} color={activeTab === "overview" ? "#fff" : "#666"} />
          <Text style={[styles.tabText, activeTab === "overview" && styles.tabTextActive]}>Overview</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "drivers" && styles.tabActive]}
          onPress={() => setActiveTab("drivers")}
        >
          <MaterialIcons name="people" size={20} color={activeTab === "drivers" ? "#fff" : "#666"} />
          <Text style={[styles.tabText, activeTab === "drivers" && styles.tabTextActive]}>Drivers</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "bookings" && styles.tabActive]}
          onPress={() => setActiveTab("bookings")}
        >
          <MaterialIcons name="assignment" size={20} color={activeTab === "bookings" ? "#fff" : "#666"} />
          <Text style={[styles.tabText, activeTab === "bookings" && styles.tabTextActive]}>Bookings</Text>
        </TouchableOpacity>
      </View>

      {/* CONTENT */}
      <View style={styles.content}>
        {activeTab === "overview" && renderOverview()}
        {activeTab === "drivers" && renderDrivers()}
        {activeTab === "bookings" && renderBookings()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f6fa",
  },
  headerContainer: {
    backgroundColor: "#e53935",
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingTop: 40,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  tabBar: {
    backgroundColor: "#fff",
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    elevation: 3,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  tabActive: {
    backgroundColor: "#e53935",
    borderBottomColor: "#e53935",
  },
  tabText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  tabTextActive: {
    color: "#fff",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  statCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginVertical: 16,
  },
  itemCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  itemSubtitle: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  onlineBadge: {
    backgroundColor: "#4CAF50",
    borderRadius: 20,
    padding: 8,
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },
  itemDetails: {
    marginBottom: 16,
  },
  itemDetail: {
    fontSize: 13,
    color: "#666",
    marginBottom: 6,
  },
  activeTrip: {
    fontSize: 12,
    color: "#e53935",
    fontWeight: "bold",
    marginTop: 8,
  },
  filterRow: {
    marginHorizontal: -16,
    marginBottom: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  filterBtn: {
    marginRight: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  filterBtnActive: {
    backgroundColor: "#e53935",
    borderColor: "#e53935",
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  filterBtnTextActive: {
    color: "#fff",
  },
  emptyState: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    marginTop: 12,
  },
  approveBtn: {
    backgroundColor: "#4CAF50",
    flexDirection: "row",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  assignBtn: {
    backgroundColor: "#2196F3",
    flexDirection: "row",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginRight: 8,
  },
  assignmentOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  btnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 13,
    marginLeft: 6,
  },
});
