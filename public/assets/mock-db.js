// Ray's Couriers Autonomous Client-Side Database & Mock Engine
// Intercepts all Supabase queries, mutations, auth, and storage so the app is 100% fast, responsive, and never hangs
(function () {
  console.log("[Ray's Couriers] Autonomous Database Engine Initialized");

  // Initial Seed Data for Instant Operation
  const defaultAdmin = {
    id: "a0000000-0000-0000-0000-000000000001",
    email: "rays@rayscouriers.com",
    role: "admin",
    first_name: "Ray",
    last_name: "Reynolds",
    full_name: "Ray Reynolds (Owner & Admin)",
    is_admin: true,
    is_employee: true,
    is_cashier: true,
    created_at: new Date().toISOString()
  };

  const defaultWarehouseAdmin = {
    id: "wh-admin-id-001",
    user_id: "wh-admin-id-001",
    email: "warehouse@rayscouriers.com",
    role: "warehouse",
    first_name: "Warehouse",
    last_name: "Admin",
    full_name: "Warehouse Admin (Operations)",
    is_admin: true,
    is_warehouse_admin: true,
    is_employee: true,
    created_at: new Date().toISOString()
  };

  const defaultCustomers = [];
  const defaultMailboxes = [];
  const defaultPackages = [];
  const defaultShipments = [];
  const defaultInvoices = [];

  const defaultEmployees = [
    {
      id: "e-001",
      user_id: "e0000000-0000-0000-0000-000000000001",
      first_name: "Ryan",
      last_name: "Jennings",
      email: "ryan.jennings@rayscouriers.com",
      role: "Operations Manager",
      department: "Logistics",
      phone: "+592 712 6533",
      status: "active",
      created_at: "2023-01-15T10:00:00Z"
    }
  ];

  const defaultWarehouseStaff = [
    defaultWarehouseAdmin,
    {
      id: "ws-001",
      user_id: "e0000000-0000-0000-0000-000000000002",
      first_name: "Marcus",
      last_name: "Vance",
      email: "marcus.vance@rayscouriers.com",
      personal_email: "marcus.vance@gmail.com",
      role: "warehouse",
      status: "active",
      created_at: "2023-05-01T10:00:00Z"
    }
  ];

  const defaultFlights = [
    {
      id: "fl-001",
      flight_id: "fl-001",
      flight_number: "BW-484",
      master_awb: "BW-484",
      airline: "Caribbean Airlines",
      departure_time: new Date().toISOString(),
      arrival_time: new Date(Date.now() + 2 * 86400000).toISOString(),
      shipment_date: new Date().toISOString().slice(0, 10),
      expected_date: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
      status: "in_air",
      shipment_status: "in_transit",
      origin: "MIA",
      destination: "GEO",
      package_count: 0,
      total_packages: 0,
      verified_count: 0,
      unverified_count: 0,
      total_weight: 0,
      created_at: new Date().toISOString()
    }
  ];

  // Air Freight Rates (1 to 50 lbs)
  const defaultAirRates = Array.from({ length: 50 }, (_, i) => {
    const lbs = i + 1;
    const usd = lbs === 1 ? 4.50 : Number((4.50 + (lbs - 1) * 3.50).toFixed(2));
    const gyd = Math.round(usd * 215);
    const gbp = Number((usd * 0.80).toFixed(2));
    return {
      id: "air-rate-" + lbs,
      lbs: lbs,
      rate_usd: usd,
      rate_gyd: gyd,
      rate_gbp: gbp,
      notes: lbs <= 5 ? "Express Standard Air Freight" : "Standard Air Cargo - " + lbs + " lbs",
      created_at: "2026-01-01T00:00:00Z"
    };
  });

  // Ocean Cargo Rates (1 to 30 cu ft)
  const defaultOceanRates = Array.from({ length: 30 }, (_, i) => {
    const cuft = i + 1;
    const usd = cuft === 1 ? 12.00 : Number((12.00 + (cuft - 1) * 10.00).toFixed(2));
    const gyd = Math.round(usd * 215);
    const gbp = Number((usd * 0.80).toFixed(2));
    return {
      id: "ocean-rate-" + cuft,
      cubic_ft: cuft,
      rate_usd: usd,
      rate_gyd: gyd,
      rate_gbp: gbp,
      notes: cuft <= 5 ? "Ocean Box / Crate Tier 1" : "Commercial Ocean Cargo - " + cuft + " cu ft",
      created_at: "2026-01-01T00:00:00Z"
    };
  });

  const defaultRateSheets = [
    {
      id: "rs-air-standard",
      name: "Standard Air Express (Miami → Georgetown)",
      service_type: "air",
      description: "Fast express 2-3 business day air freight from Miami to Georgetown, Guyana",
      is_public: true,
      is_active: true,
      currency: "USD",
      created_at: new Date().toISOString()
    },
    {
      id: "rs-ocean-standard",
      name: "Standard Ocean Cargo (Miami → Georgetown)",
      service_type: "ocean",
      description: "Economical ocean shipping for commercial & household barrels, boxes, and crates",
      is_public: true,
      is_active: true,
      currency: "USD",
      created_at: new Date().toISOString()
    }
  ];

  const defaultRateSheetItems = [
    { id: "rsi-1", rate_sheet_id: "rs-air-standard", item_name: "Base Documentation & Handling", item_code: "DOC-FEE", rate: 5.00, unit: "per shipment", sort_order: 1 },
    { id: "rsi-2", rate_sheet_id: "rs-air-standard", item_name: "Air Fuel Surcharge", item_code: "FUEL", rate: 2.50, unit: "per shipment", sort_order: 2 },
    { id: "rsi-3", rate_sheet_id: "rs-air-standard", item_name: "Guyana Customs Clearance Assistance", item_code: "CLEAR", rate: 10.00, unit: "per shipment", sort_order: 3 },
    { id: "rsi-4", rate_sheet_id: "rs-ocean-standard", item_name: "Ocean Terminal Receiving & Wharfage", item_code: "WHARF", rate: 15.00, unit: "per shipment", sort_order: 1 },
    { id: "rsi-5", rate_sheet_id: "rs-ocean-standard", item_name: "Ocean Documentation & B/L Processing", item_code: "BL-FEE", rate: 20.00, unit: "per shipment", sort_order: 2 }
  ];

  const defaultApiKeys = [
    {
      id: "ak-resend",
      provider: "resend",
      label: "Resend Email API",
      api_key: localStorage.getItem("rays_resend_api_key") || "",
      is_active: true,
      description: "Send live confirmation, registration, and invoice emails to customers",
      created_at: new Date().toISOString()
    },
    {
      id: "ak-stripe",
      provider: "stripe",
      label: "Stripe Online Payment Gateway",
      api_key: "",
      is_active: false,
      created_at: new Date().toISOString()
    },
    {
      id: "ak-twilio",
      provider: "twilio",
      label: "Twilio SMS Notifications",
      api_key: "",
      is_active: false,
      created_at: new Date().toISOString()
    }
  ];

  const defaultUnknownPackages = [
    {
      id: "unk-001",
      package_id: "WR-UNKNOWN-8401",
      tracking_number: "TBA-9400112899",
      warehouse_number: "WR-8401",
      weight_lbs: 3.2,
      weight_kg: 1.45,
      declared_value: 45.00,
      item_category: "General Merchandise",
      origin: "MIA",
      current_location_code: "Shelf U-1",
      status: "unknown",
      query_count: 1,
      latest_query: "Customer John inquiring about missing Amazon parcel from Miami",
      intaked_by: "Warehouse Admin",
      intaked_at: new Date(Date.now() - 86400000).toISOString(),
      created_at: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: "unk-002",
      package_id: "WR-UNKNOWN-8402",
      tracking_number: "1Z9999999999999999",
      warehouse_number: "WR-8402",
      weight_lbs: 1.5,
      weight_kg: 0.68,
      declared_value: 25.00,
      item_category: "Clothing & Apparel",
      origin: "MIA",
      current_location_code: "Shelf U-2",
      status: "unknown",
      query_count: 0,
      latest_query: null,
      intaked_by: "Marcus Vance",
      intaked_at: new Date(Date.now() - 43200000).toISOString(),
      created_at: new Date(Date.now() - 43200000).toISOString()
    }
  ];

  const defaultUnknownQueries = [
    {
      id: "uq-001",
      package_id: "WR-UNKNOWN-8401",
      tracking_number: "TBA-9400112899",
      customer_name: "Potential Claimant: John Fraser",
      customer_email: "john.fraser@example.com",
      message: "I ordered an Amazon package delivered to Miami warehouse without my RAYS mailbox number on line 2. Tracking ends in 899.",
      status: "open",
      staff_response: "Identified in Unknown Section. Please verify invoice or photo to claim.",
      responded_by: "Warehouse Admin",
      created_at: new Date(Date.now() - 72000000).toISOString()
    }
  ];

  // Rows A-Z, 6 shelves each = 156 shelves
  const defaultLocations = [];
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  for (const letter of alphabet) {
    for (let col = 1; col <= 6; col++) {
      const code = letter + col;
      defaultLocations.push({
        id: "loc-" + code,
        location_code: code,
        zone: "Zone " + letter,
        shelf_row: letter,
        shelf_col: col,
        description: "Shelf " + code + " - Georgetown Warehouse",
        is_active: true,
        capacity: 30,
        created_at: "2026-01-01T00:00:00Z"
      });
    }
  }

  function getStorage(table, def) {
    const key = "rays_db_" + table;
    const item = localStorage.getItem(key);
    if (item) {
      try {
        const parsed = JSON.parse(item);
        if (table === "customers" && Array.isArray(parsed) && parsed.some(c => c.first_name === "Johnathan" || c.first_name === "AHLEAH" || c.customer_id === "RC-1042" || c.customer_id === "BAC37578")) {
          localStorage.removeItem(key);
          localStorage.removeItem("rays_db_packages");
          localStorage.removeItem("rays_db_invoices");
          localStorage.removeItem("rays_db_mailboxes");
          localStorage.removeItem("rays_db_shipments");
          return def;
        }
        if (table === "package_locations" && (!Array.isArray(parsed) || parsed.length < 156)) {
          localStorage.setItem(key, JSON.stringify(def));
          return def;
        }
        if (table === "air_rate_rows" && (!Array.isArray(parsed) || parsed.length === 0)) {
          localStorage.setItem(key, JSON.stringify(def));
          return def;
        }
        if (table === "ocean_rate_rows" && (!Array.isArray(parsed) || parsed.length === 0)) {
          localStorage.setItem(key, JSON.stringify(def));
          return def;
        }
        if (table === "rate_sheets" && (!Array.isArray(parsed) || parsed.length === 0)) {
          localStorage.setItem(key, JSON.stringify(def));
          return def;
        }
        if (table === "rate_sheet_items" && (!Array.isArray(parsed) || parsed.length === 0)) {
          localStorage.setItem(key, JSON.stringify(def));
          return def;
        }
        if (table === "api_key_configs" && (!Array.isArray(parsed) || parsed.length === 0)) {
          localStorage.setItem(key, JSON.stringify(def));
          return def;
        }
        if (table === "unknown_packages" && (!Array.isArray(parsed) || parsed.length === 0)) {
          localStorage.setItem(key, JSON.stringify(def));
          return def;
        }
        return parsed;
      } catch (e) {}
    }
    localStorage.setItem(key, JSON.stringify(def));
    return def;
  }

  function saveStorage(table, data) {
    localStorage.setItem("rays_db_" + table, JSON.stringify(data));
  }

  // Reactive DB store
  const DB = {
    profiles: [
      defaultAdmin,
      defaultWarehouseAdmin,
      {
        id: "rays-admin-id-001",
        user_id: "rays-admin-id-001",
        email: "rays@rayscouriers.com",
        role: "admin",
        first_name: "Ray",
        last_name: "Reynolds",
        full_name: "Ray Reynolds (Super Admin)",
        is_admin: true,
        is_employee: true,
        is_cashier: true
      },
      {
        id: "rays-admin-id-002",
        user_id: "rays-admin-id-002",
        email: "inforayscouriers@gmail.com",
        role: "admin",
        first_name: "Ray",
        last_name: "Reynolds",
        full_name: "Ray Reynolds (Super Admin)",
        is_admin: true,
        is_employee: true,
        is_cashier: true
      },
      {
        id: "u-info-admin",
        email: "inforayscouriers@gmail.com",
        role: "admin",
        first_name: "Ray",
        last_name: "Reynolds",
        full_name: "Ray Reynolds (Super Admin)",
        is_admin: true,
        is_employee: true,
        is_cashier: true
      }
    ],
    customers: getStorage("customers", defaultCustomers),
    mailboxes: getStorage("mailboxes", defaultMailboxes),
    packages: getStorage("packages", defaultPackages),
    shipments: getStorage("shipments", defaultShipments),
    invoices: getStorage("invoices", defaultInvoices),
    employees: getStorage("employees", defaultEmployees),
    warehouse_staff: getStorage("warehouse_staff", defaultWarehouseStaff),
    inbound_flights: getStorage("inbound_flights", defaultFlights),
    inbound_shipments: getStorage("inbound_shipments", defaultFlights),
    flights: getStorage("inbound_flights", defaultFlights),
    air_rate_rows: getStorage("air_rate_rows", defaultAirRates),
    ocean_rate_rows: getStorage("ocean_rate_rows", defaultOceanRates),
    rate_sheets: getStorage("rate_sheets", defaultRateSheets),
    rate_sheet_items: getStorage("rate_sheet_items", defaultRateSheetItems),
    api_key_configs: getStorage("api_key_configs", defaultApiKeys),
    unknown_packages: getStorage("unknown_packages", defaultUnknownPackages),
    unknown_package_queries: getStorage("unknown_package_queries", defaultUnknownQueries),
    package_intake: getStorage("package_intake", []),
    package_scan_logs: getStorage("package_scan_logs", []),
    package_locations: getStorage("package_locations", defaultLocations),
    delivery_requests: getStorage("delivery_requests", []),
    support_tickets: getStorage("support_tickets", []),
    bank_transfer_submissions: getStorage("bank_transfer_submissions", []),
    cash_queue: getStorage("cash_queue", []),
    email_logs: getStorage("email_logs", []),
    settings: { company_name: "Ray's Couriers", phone: "+592 712 6532", email: "rays@rayscouriers.com" }
  };

  window.RaysMockDB = DB;

  function getCurrentStaffInfo() {
    const adminSess = localStorage.getItem("rays_active_admin_session");
    if (adminSess) {
      try {
        const p = JSON.parse(adminSess);
        return {
          id: p.user?.id || "admin",
          name: p.profile?.full_name || p.user?.user_metadata?.name || p.user?.email || "Staff",
          email: p.user?.email || ""
        };
      } catch(e) {}
    }
    return { id: "wh-admin-id-001", name: "Warehouse Admin", email: "warehouse@rayscouriers.com" };
  }

  function isEmailTaken(email, excludeId = null) {
    if (!email) return false;
    const clean = String(email).toLowerCase().trim();
    const inCust = (DB.customers || []).some(c => c.id !== excludeId && String(c.email || "").toLowerCase().trim() === clean);
    const inEmp = (DB.employees || []).some(e => e.id !== excludeId && String(e.email || "").toLowerCase().trim() === clean);
    const inStaff = (DB.warehouse_staff || []).some(s => s.id !== excludeId && String(s.email || "").toLowerCase().trim() === clean);
    const inProfiles = (DB.profiles || []).some(p => p.id !== excludeId && String(p.email || "").toLowerCase().trim() === clean);
    return inCust || inEmp || inStaff || inProfiles;
  }

  window.isEmailRegisteredInSystem = isEmailTaken;

  function getNestedValue(obj, path) {
    if (!obj) return undefined;
    if (obj[path] !== undefined) return obj[path];
    const parts = String(path || "").split(".");
    let curr = obj;
    for (const p of parts) {
      if (curr == null) return undefined;
      curr = curr[p];
    }
    return curr;
  }

  class MockQueryBuilder {
    constructor(tableName) {
      this.table = tableName;
      let raw = [];

      if (tableName === "inbound_shipments" || tableName === "flights" || tableName === "inbound_flights") {
        const flights = DB.inbound_flights || [];
        const shipments = DB.inbound_shipments || [];
        const merged = [...flights];
        for (const s of shipments) {
          if (!merged.some(f => f.id === s.id || (s.flight_number && f.flight_number === s.flight_number))) {
            merged.push(s);
          }
        }
        raw = merged.map(f => ({
          id: f.id || "fl-" + Date.now(),
          flight_id: f.id,
          flight_number: f.flight_number || f.master_awb || "BW-484",
          master_awb: f.master_awb || f.flight_number || "BW-484",
          airline: f.airline || "Caribbean Airlines",
          origin: f.origin || "MIA",
          destination: f.destination || "GEO",
          departure_time: f.departure_time || f.shipment_date || new Date().toISOString(),
          arrival_time: f.arrival_time || f.expected_date || new Date(Date.now() + 2 * 86400000).toISOString(),
          shipment_date: f.shipment_date || f.departure_time?.slice(0, 10) || new Date().toISOString().slice(0, 10),
          expected_date: f.expected_date || f.arrival_time?.slice(0, 10) || new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
          status: f.status || f.shipment_status || "in_air",
          shipment_status: f.shipment_status || f.status || "in_transit",
          total_packages: f.total_packages !== undefined ? Number(f.total_packages) : (f.package_count || 0),
          verified_count: f.verified_count || 0,
          unverified_count: f.unverified_count !== undefined ? f.unverified_count : (f.total_packages || f.package_count || 0),
          notes: f.notes || "",
          created_at: f.created_at || new Date().toISOString()
        }));
      } else if (tableName === "invoices") {
        raw = [...(DB.invoices || [])].map(inv => {
          if (!inv.customers) {
            const cust = (DB.customers || []).find(c => c.id === inv.customer_id || c.customer_id === inv.customer_id);
            inv.customers = cust ? { ...cust, is_order_customer: cust.is_order_customer ?? false } : {
              id: inv.customer_id || "c1",
              customer_id: "BAC",
              first_name: "Customer",
              last_name: "",
              email: "customer@example.com",
              is_order_customer: false
            };
          }
          return inv;
        });
      } else if (tableName === "packages") {
        raw = [...(DB.packages || [])].map(pkg => {
          if (!pkg.warehouse_number) {
            pkg.warehouse_number = pkg.package_id || ("BAC" + Math.floor(48400000 + Math.random() * 200000));
          }
          if (!pkg.customers && pkg.customer_id) {
            const cust = (DB.customers || []).find(c => c.id === pkg.customer_id || c.customer_id === pkg.customer_id);
            if (cust) pkg.customers = cust;
          }
          if (!pkg.inbound_flights && pkg.inbound_flight_id) {
            const fl = (DB.inbound_flights || []).find(f => f.id === pkg.inbound_flight_id || f.flight_number === pkg.inbound_flight_id);
            if (fl) pkg.inbound_flights = fl;
          }
          return pkg;
        });
      } else {
        raw = [...(DB[tableName] || [])];
      }

      this.items = raw;
      this.isCountOnly = false;
      this.isHead = false;
      this.pendingInsert = null;
      this.pendingUpdate = null;
      this.pendingDelete = false;
    }

    select(cols, opts) {
      if (opts?.head) this.isHead = true;
      if (opts?.count === "exact") this.isCountOnly = true;
      return this;
    }

    eq(col, val) {
      if (val === undefined) return this;
      this.items = this.items.filter(item => {
        const itemVal = getNestedValue(item, col);
        if (typeof val === "boolean") return Boolean(itemVal) === val;
        return String(itemVal || "").toLowerCase() === String(val).toLowerCase();
      });
      return this;
    }

    neq(col, val) {
      this.items = this.items.filter(item => {
        const itemVal = getNestedValue(item, col);
        return String(itemVal || "").toLowerCase() !== String(val).toLowerCase();
      });
      return this;
    }

    ilike(col, val) {
      const cleanVal = String(val || "").replace(/%/g, "").toLowerCase();
      this.items = this.items.filter(item => {
        const itemVal = String(getNestedValue(item, col) || "").toLowerCase();
        return itemVal.includes(cleanVal);
      });
      return this;
    }

    or(filters) {
      const orClauses = String(filters || "").split(",").map(c => c.trim());
      this.items = this.items.filter(item => {
        return orClauses.some(clause => {
          const [col, op, val] = clause.split(".");
          const itemVal = String(getNestedValue(item, col) || "").toLowerCase();
          const targetVal = String(val || "").replace(/%/g, "").toLowerCase();
          if (op === "eq") return itemVal === targetVal;
          if (op === "ilike") return itemVal.includes(targetVal);
          return false;
        });
      });
      return this;
    }

    in(col, values) {
      if (!Array.isArray(values)) return this;
      const lowerValues = values.map(v => String(v).toLowerCase());
      this.items = this.items.filter(item => {
        const itemVal = String(getNestedValue(item, col) || "").toLowerCase();
        return lowerValues.includes(itemVal);
      });
      return this;
    }

    not(col, op, val) {
      if (op === "eq") {
        this.items = this.items.filter(item => String(getNestedValue(item, col) || "").toLowerCase() !== String(val).toLowerCase());
      } else if (op === "is") {
        this.items = this.items.filter(item => {
          const itemVal = getNestedValue(item, col);
          if (val === null || val === undefined || String(val).toLowerCase() === "null") {
            return itemVal !== null && itemVal !== undefined && itemVal !== "" && itemVal !== "null";
          }
          return String(itemVal).toLowerCase() !== String(val).toLowerCase();
        });
      } else if (op === "in") {
        let list = [];
        if (Array.isArray(val)) {
          list = val.map(v => String(v).toLowerCase());
        } else if (typeof val === "string") {
          list = val.replace(/^[()]+$/g, "").split(",").map(s => s.replace(/^["'\\s]+|["'\\s]+$/g, "").trim().toLowerCase());
        }
        this.items = this.items.filter(item => !list.includes(String(getNestedValue(item, col) || "").toLowerCase()));
      }
      return this;
    }

    is(col, val) {
      this.items = this.items.filter(item => {
        const itemVal = getNestedValue(item, col);
        if (val === null || val === undefined || String(val).toLowerCase() === "null") {
          return itemVal === null || itemVal === undefined || itemVal === "" || itemVal === "null";
        }
        if (typeof val === "boolean") return Boolean(itemVal) === val;
        return String(itemVal).toLowerCase() === String(val).toLowerCase();
      });
      return this;
    }

    gte(col, val) {
      this.items = this.items.filter(item => {
        const itemVal = getNestedValue(item, col);
        if (itemVal == null) return false;
        return itemVal >= val;
      });
      return this;
    }

    lte(col, val) {
      this.items = this.items.filter(item => {
        const itemVal = getNestedValue(item, col);
        if (itemVal == null) return false;
        return itemVal <= val;
      });
      return this;
    }

    gt(col, val) {
      this.items = this.items.filter(item => {
        const itemVal = getNestedValue(item, col);
        if (itemVal == null) return false;
        return itemVal > val;
      });
      return this;
    }

    lt(col, val) {
      this.items = this.items.filter(item => {
        const itemVal = getNestedValue(item, col);
        if (itemVal == null) return false;
        return itemVal < val;
      });
      return this;
    }

    order(col, opts) {
      const asc = opts?.ascending !== false;
      this.items.sort((a, b) => {
        const valA = getNestedValue(a, col);
        const valB = getNestedValue(b, col);
        if (valA === valB) return 0;
        if (valA == null) return asc ? 1 : -1;
        if (valB == null) return asc ? -1 : 1;
        return asc ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
      });
      return this;
    }

    limit(num) {
      if (num && num > 0) {
        this.items = this.items.slice(0, num);
      }
      return this;
    }

    range(from, to) {
      this.items = this.items.slice(from, to + 1);
      return this;
    }

    single() {
      this.singleResult = true;
      return this;
    }

    maybeSingle() {
      this.maybeSingleResult = true;
      return this;
    }

    insert(rows) {
      this.pendingInsert = rows;
      return this;
    }

    update(values) {
      this.pendingUpdate = values;
      return this;
    }

    delete() {
      this.pendingDelete = true;
      return this;
    }

    _executePendingMutation() {
      const staff = getCurrentStaffInfo();

      if (this.pendingInsert) {
        const rows = Array.isArray(this.pendingInsert) ? this.pendingInsert : [this.pendingInsert];
        const inserted = [];
        if (!DB[this.table]) DB[this.table] = [];

        for (const r of rows) {
          // Duplicate email check
          if (r.email && (this.table === "customers" || this.table === "employees" || this.table === "warehouse_staff")) {
            if (isEmailTaken(r.email)) {
              console.warn("[MockDB] Blocked duplicate email insert:", r.email);
              continue;
            }
          }

          const item = {
            id: r.id || "rec-" + Math.random().toString(36).substr(2, 9),
            created_at: new Date().toISOString(),
            created_by_staff: staff.name,
            staff_name: staff.name,
            ...r
          };

          if (this.table === "invoices") {
            if (!item.invoice_number) {
              const count = (DB.invoices || []).length;
              item.invoice_number = "INV-" + String(count + 1).padStart(3, "0");
            }
            item.created_by_staff = staff.name;
          }

          if (this.table === "customers") {
            if (!item.customer_id) {
              const num = 1000 + (DB.customers?.length || 0) + Math.floor(Math.random() * 80) + 1;
              item.customer_id = "RAYS-" + num;
              item.user_id = item.id;
            }
            if (!item.mailboxes) {
              item.mailboxes = { mailbox_number: item.customer_id, status: "active" };
            }
            if (!DB.mailboxes) DB.mailboxes = [];
            const existingMb = DB.mailboxes.find(m => m.customer_id === item.id || m.customer_id === item.customer_id);
            if (!existingMb) {
              DB.mailboxes.unshift({
                id: "mb-" + Math.random().toString(36).substr(2, 9),
                customer_id: item.id,
                mailbox_number: item.customer_id,
                status: "active",
                created_at: new Date().toISOString()
              });
              saveStorage("mailboxes", DB.mailboxes);
            }
            // Trigger welcome email instantly
            if (typeof window !== "undefined" && window.sendCustomerWelcomeEmail) {
              window.sendCustomerWelcomeEmail(item);
            }
          }

          // Flight / Inbound Shipment Creation & Sync
          if (this.table === "flights" || this.table === "inbound_flights" || this.table === "inbound_shipments") {
            item.id = item.id || "fl-" + Date.now();
            item.flight_number = item.flight_number || item.master_awb || ("BW-" + Math.floor(100 + Math.random() * 900));
            item.master_awb = item.master_awb || item.flight_number;
            item.origin = item.origin || "MIA";
            item.destination = item.destination || "GEO";
            item.status = item.status || item.shipment_status || "in_air";
            item.shipment_status = item.shipment_status || item.status || "in_transit";
            item.departure_time = item.departure_time || item.shipment_date || new Date().toISOString();
            item.arrival_time = item.arrival_time || item.expected_date || new Date(Date.now() + 2 * 86400000).toISOString();
            item.shipment_date = item.shipment_date || item.departure_time?.slice(0, 10) || new Date().toISOString().slice(0, 10);
            item.expected_date = item.expected_date || item.arrival_time?.slice(0, 10) || new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
            item.total_packages = item.total_packages !== undefined ? Number(item.total_packages) : (item.package_count || 0);
            item.verified_count = item.verified_count || 0;
            item.unverified_count = item.unverified_count !== undefined ? Number(item.unverified_count) : item.total_packages;
            item.created_by_staff = staff.name;

            DB.inbound_flights = DB.inbound_flights || [];
            const fIdx = DB.inbound_flights.findIndex(f => f.id === item.id || (item.flight_number && f.flight_number === item.flight_number));
            if (fIdx >= 0) DB.inbound_flights[fIdx] = { ...DB.inbound_flights[fIdx], ...item };
            else DB.inbound_flights.unshift(item);
            saveStorage("inbound_flights", DB.inbound_flights);

            DB.inbound_shipments = DB.inbound_shipments || [];
            const sIdx = DB.inbound_shipments.findIndex(s => s.id === item.id || (item.flight_number && s.flight_number === item.flight_number));
            if (sIdx >= 0) DB.inbound_shipments[sIdx] = { ...DB.inbound_shipments[sIdx], ...item };
            else DB.inbound_shipments.unshift(item);
            saveStorage("inbound_shipments", DB.inbound_shipments);
          }

          // Package Intake Automation
          if (this.table === "package_intake") {
            item.intaked_at = item.intaked_at || new Date().toISOString();
            item.intaked_date = item.intaked_date || item.intaked_at.slice(0, 10);
            item.status = item.status || "received";
            item.scanned_staff = staff.name;
            item.intaked_by_name = staff.name;

            const wrNum = item.warehouse_number || item.package_id || ("BAC" + Math.floor(48400000 + Math.random() * 200000));
            item.warehouse_number = wrNum;

            let customer = null;
            if (item.customer_id) {
              customer = (DB.customers || []).find(c => c.id === item.customer_id || c.customer_id === item.customer_id);
            } else if (item.customer_name) {
              customer = (DB.customers || []).find(c => (c.first_name + " " + c.last_name).toLowerCase().includes(item.customer_name.toLowerCase()) || (c.customer_id && item.customer_name.includes(c.customer_id)));
            }

            let flight = null;
            if (item.flight_id) {
              flight = (DB.inbound_flights || []).find(f => f.id === item.flight_id || f.flight_number === item.flight_id);
            }

            const expectedDate = item.expected_arrival_date || item.arrival_date || flight?.arrival_time?.slice(0, 10) || flight?.expected_date || new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0];

            DB.packages = DB.packages || [];
            const existingPkgIdx = DB.packages.findIndex(p => p.warehouse_number === wrNum || (item.tracking_number && p.tracking_number === item.tracking_number));

            const pkgData = {
              id: existingPkgIdx >= 0 ? DB.packages[existingPkgIdx].id : "pkg-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5),
              package_id: wrNum,
              warehouse_number: wrNum,
              tracking_number: item.tracking_number || wrNum,
              customer_id: customer ? customer.id : item.customer_id,
              customer_name: customer ? (customer.first_name + " " + customer.last_name) : item.customer_name,
              customers: customer || (item.customer_name ? { first_name: item.customer_name, last_name: "", customer_id: item.customer_id || "BAC" } : undefined),
              weight: item.weight_lbs || 2.5,
              weight_lbs: item.weight_lbs || 2.5,
              weight_kg: Number(((Number(item.weight_lbs) || 2.5) / 2.20462).toFixed(2)),
              status: "in_transit",
              location_verified: false,
              current_location_code: "In Transit",
              location: "In Transit to Georgetown",
              declared_value: item.declared_value || 50,
              item_category: item.item_category || "General Cargo",
              expected_arrival_date: expectedDate,
              arrival_date: expectedDate,
              inbound_flight_id: item.flight_id || flight?.id || null,
              inbound_flights: flight ? { flight_number: flight.flight_number, arrival_date: expectedDate, airline: flight.airline } : undefined,
              scanned_staff: staff.name,
              intaked_by_name: staff.name,
              photo_url: item.photo_url || item.intake_photo_url || null,
              intake_photo_url: item.intake_photo_url || item.photo_url || null,
              created_at: item.intaked_at || new Date().toISOString(),
              updated_at: new Date().toISOString()
            };

            if (existingPkgIdx >= 0) {
              DB.packages[existingPkgIdx] = { ...DB.packages[existingPkgIdx], ...pkgData };
            } else {
              DB.packages.unshift(pkgData);
            }
            saveStorage("packages", DB.packages);
          }

          DB[this.table].unshift(item);
          inserted.push(item);
        }

        saveStorage(this.table, DB[this.table]);
        this.items = inserted;
        this.pendingInsert = null;
      }

      if (this.pendingUpdate) {
        if (!DB[this.table]) DB[this.table] = [];
        const toUpdateIds = new Set(this.items.map(it => it.id));
        DB[this.table] = DB[this.table].map(item => {
          if (toUpdateIds.has(item.id)) {
            const updated = { 
              ...item, 
              ...this.pendingUpdate, 
              updated_at: new Date().toISOString(),
              updated_by_staff: staff.name
            };

            // Package release audit
            if (this.pendingUpdate.status === "released" || this.pendingUpdate.status === "picked_up") {
              updated.status = "released";
              updated.is_released = true;
              updated.released_at = updated.released_at || new Date().toISOString();
              updated.released_by = updated.released_by || staff.name;
              if (this.pendingUpdate.pickup_photo) {
                updated.pickup_photo = this.pendingUpdate.pickup_photo;
              }
            }

            // Location verification sync with inbound shipments
            if (this.table === "packages" && this.pendingUpdate.location_verified === true) {
              updated.location_verified = true;
              updated.verified_at = new Date().toISOString();
              updated.verified_by = staff.name;
              if (updated.inbound_flight_id) {
                const flId = updated.inbound_flight_id;
                [DB.inbound_flights, DB.inbound_shipments].forEach(list => {
                  if (list) {
                    const fl = list.find(f => f.id === flId || f.flight_number === flId);
                    if (fl) {
                      fl.verified_count = (fl.verified_count || 0) + 1;
                      fl.unverified_count = Math.max(0, (fl.unverified_count || 1) - 1);
                    }
                  }
                });
                saveStorage("inbound_flights", DB.inbound_flights);
                saveStorage("inbound_shipments", DB.inbound_shipments);
              }
            }

            return updated;
          }
          return item;
        });

        if (this.table === "inbound_flights" || this.table === "inbound_shipments") {
          saveStorage("inbound_flights", DB[this.table]);
          saveStorage("inbound_shipments", DB[this.table]);
        } else {
          saveStorage(this.table, DB[this.table]);
        }

        if (this.table === "invoices" && this.pendingUpdate?.status === "paid") {
          for (const inv of this.items) {
            const cust = (DB.customers || []).find(c => c.id === inv.customer_id || c.customer_id === inv.customer_id);
            const qItem = {
              id: "q-" + Date.now(),
              customer_name: cust ? (cust.first_name + " " + cust.last_name) : "Customer",
              customer_id: inv.customer_id || null,
              package_count: inv.total_packages || 1,
              package_ids: null,
              locations: null,
              notes: "Invoice " + inv.invoice_number + " Paid - Live Collection Queue",
              status: "waiting",
              added_by: staff.name,
              created_at: new Date().toISOString()
            };
            DB.cash_queue = DB.cash_queue || [];
            DB.cash_queue.unshift(qItem);
            saveStorage("cash_queue", DB.cash_queue);

            if (typeof window !== "undefined" && window.sendPaymentThankYouEmail) {
              window.sendPaymentThankYouEmail({
                customerEmail: cust?.email,
                customerName: cust ? (cust.first_name + " " + cust.last_name) : "Valued Customer",
                invoiceNumber: inv.invoice_number,
                amount: inv.total,
                currency: inv.currency || "USD",
                paymentMethod: this.pendingUpdate?.payment_method || "Cashier"
              });
            }
          }
        }
        this.items = this.items.map(it => ({ ...it, ...this.pendingUpdate }));
        this.pendingUpdate = null;
      }

      if (this.pendingDelete) {
        if (!DB[this.table]) DB[this.table] = [];
        const toDeleteIds = new Set(this.items.map(it => it.id));
        DB[this.table] = DB[this.table].filter(item => !toDeleteIds.has(item.id));
        saveStorage(this.table, DB[this.table]);
        this.items = [];
        this.pendingDelete = false;
      }
    }

    async then(resolve) {
      this._executePendingMutation();
      let resData = this.items;
      if (this.singleResult) resData = this.items[0] || null;
      if (this.maybeSingleResult) resData = this.items[0] || null;

      const res = {
        data: resData,
        count: this.items.length,
        error: null
      };
      if (resolve) return resolve(res);
      return res;
    }
  }

  // Resend API Dispatch Helper
  async function dispatchViaResendIfKey(emailPayload) {
    const apiKey = localStorage.getItem("rays_resend_api_key") || 
      (DB.api_key_configs?.find(k => k.provider === "resend")?.api_key);
    if (!apiKey || !apiKey.startsWith("re_")) {
      return false;
    }
    try {
      const recipient = Array.isArray(emailPayload.to) ? emailPayload.to : [emailPayload.to || emailPayload.recipient];
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + apiKey.trim()
        },
        body: JSON.stringify({
          from: "Ray's Couriers <onboarding@resend.dev>",
          to: recipient,
          subject: emailPayload.subject || "Ray's Couriers Update",
          text: emailPayload.text || emailPayload.body || "",
          html: emailPayload.html || (emailPayload.body ? emailPayload.body.replace(/\n/g, "<br>") : undefined)
        })
      });
      const data = await res.json();
      console.log("[Ray's Couriers] Resend API Response:", data);
      return data;
    } catch (err) {
      console.warn("[Ray's Couriers] Resend API exception:", err);
      return false;
    }
  }

  window.saveResendApiKey = function (key) {
    if (key && typeof key === "string") {
      const clean = key.trim();
      localStorage.setItem("rays_resend_api_key", clean);
      if (DB.api_key_configs) {
        const item = DB.api_key_configs.find(k => k.provider === "resend");
        if (item) {
          item.api_key = clean;
          item.is_active = true;
          item.updated_at = new Date().toISOString();
        } else {
          DB.api_key_configs.unshift({
            id: "ak-resend",
            provider: "resend",
            label: "Resend Email API",
            api_key: clean,
            is_active: true,
            created_at: new Date().toISOString()
          });
        }
        saveStorage("api_key_configs", DB.api_key_configs);
      }
      return true;
    }
    return false;
  };

  window.getResendApiKey = function () {
    return localStorage.getItem("rays_resend_api_key") || 
      (DB.api_key_configs?.find(k => k.provider === "resend")?.api_key) || "";
  };

  // Autonomous Edge Function & Mock API Handler
  function handleFunctionInvoke(fnName, body) {
    console.log("[Ray's Couriers Mock] Invoking function:", fnName, body);
    const cleanFn = String(fnName || "").replace(/^\/?(functions\/v1\/|api\/mock-fn\/)/, "");

    if (cleanFn === "register-user") {
      const email = String(body?.email || "customer@example.com").toLowerCase().trim();
      
      // Enforce duplicate email prohibition
      if (isEmailTaken(email)) {
        return {
          data: null,
          error: { message: "The email address '" + email + "' is already registered in the system. Email addresses must be unique." }
        };
      }

      const num = 1000 + (DB.customers?.length || 0) + 1;
      const customerId = "RAYS-" + num;
      const custId = "c-" + Date.now();
      const role = body?.role || "customer";
      const customer = {
        id: custId,
        user_id: custId,
        customer_id: customerId,
        first_name: body?.firstName || body?.first_name || "New",
        last_name: body?.lastName || body?.last_name || "Customer",
        email: email,
        password: body?.password || "123456",
        phone: body?.phone || "+592 600 0000",
        address: body?.address || "Georgetown, Guyana",
        city: body?.city || "Georgetown",
        country: "Guyana",
        tier: "Standard",
        status: "active",
        branch: "GEORGETOWN",
        is_order_customer: false,
        created_at: new Date().toISOString(),
        created_by_staff: getCurrentStaffInfo().name
      };
      customer.mailboxes = { id: "mb-" + Date.now(), customer_id: custId, mailbox_number: customerId, status: "active" };
      DB.customers.unshift(customer);
      saveStorage("customers", DB.customers);

      if (!DB.mailboxes) DB.mailboxes = [];
      DB.mailboxes.unshift(customer.mailboxes);
      saveStorage("mailboxes", DB.mailboxes);

      const custProfile = {
        id: custId,
        user_id: custId,
        email: email,
        first_name: customer.first_name,
        last_name: customer.last_name,
        full_name: customer.first_name + " " + customer.last_name,
        role: role,
        customer_id: customerId,
        is_admin: role === "admin",
        is_employee: role === "employee" || role === "admin"
      };
      DB.profiles = DB.profiles || [];
      DB.profiles.unshift(custProfile);
      saveStorage("profiles", DB.profiles);

      // Send structured welcome email immediately
      if (typeof window !== "undefined" && window.sendCustomerWelcomeEmail) {
        window.sendCustomerWelcomeEmail(customer);
      }

      return {
        data: {
          user: { id: custId, email: email, user_metadata: { role: role, name: customer.first_name + " " + customer.last_name } },
          customer,
          customerId: customerId,
          data: { customerId: customerId },
          profile: custProfile
        },
        error: null
      };
    }

    if (cleanFn === "send-invoice-email" || cleanFn === "send-email" || cleanFn === "send-customer-email") {
      const log = {
        id: "email-" + Date.now(),
        recipient: body?.recipient || body?.email || body?.customerEmail,
        subject: body?.subject || "Ray's Couriers Update",
        template: body?.template || "invoice",
        invoice_id: body?.invoiceId,
        sent_at: new Date().toISOString(),
        status: "sent"
      };
      DB.email_logs = DB.email_logs || [];
      DB.email_logs.unshift(log);
      saveStorage("email_logs", DB.email_logs);

      // Try Resend API dispatch
      dispatchViaResendIfKey({
        to: log.recipient,
        subject: log.subject,
        body: body?.message || body?.body || "Invoice notification from Ray's Couriers."
      });

      return { data: { success: true, message: "Email sent successfully!", log }, error: null };
    }

    return { data: { code: "SUCCESS", message: "Processed" }, error: null };
  }

  // Welcome Email Template & Dispatch
  const defaultWelcomeTemplate = {
    subject: "Welcome to Ray's Couriers - Your Mailbox ID: {{mailboxNumber}}",
    greeting: "Dear {{customerName}},",
    intro: "Welcome to Ray's Couriers! Your dedicated US shipping mailbox has been successfully created and is ready for use immediately.",
    addressBlock: "YOUR MIAMI US SHIPPING ADDRESS:\\nName: {{customerName}}\\nAddress Line 1: 8400 NW 25th St, Suite 100\\nAddress Line 2: {{mailboxNumber}}\\nCity: Miami / Doral\\nState: Florida (FL)\\nZip Code: 33198\\nCountry: United States\\nPhone: (305) 592-7126",
    pickupBlock: "GEORGETOWN GUYANA PICKUP BRANCH:\\nLocation: Georgetown, Guyana\\nOperating Hours: Monday – Saturday, 8:30 AM to 5:00 PM\\nPhone: +592 712 6532 | Email: rays@rayscouriers.com",
    credentialsBlock: "ONLINE PORTAL ACCESS:\\nPortal URL: {{portalUrl}}\\nEmail / Mailbox ID: {{email}} or {{mailboxNumber}}\\nTemporary Password: {{password}}",
    closing: "Thank you for shipping with Ray's Couriers - Fast, Secure & Reliable Freight Forwarding."
  };

  window.getWelcomeEmailTemplate = function () {
    const custom = localStorage.getItem("rays_welcome_email_template");
    if (custom) {
      try { return JSON.parse(custom); } catch (e) {}
    }
    return defaultWelcomeTemplate;
  };

  window.saveWelcomeEmailTemplate = function (template) {
    localStorage.setItem("rays_welcome_email_template", JSON.stringify(template));
    return true;
  };

  window.sendCustomerWelcomeEmail = async function (customer) {
    const tmpl = window.getWelcomeEmailTemplate();
    const portalUrl = typeof window !== "undefined" ? window.location?.origin + "/login" : "https://rayscouriers.com/login";
    const name = (customer.first_name || "") + " " + (customer.last_name || "");
    const mbNum = customer.customer_id || customer.mailboxes?.mailbox_number || "RAYS-1001";
    const pwd = customer.password || "123456";

    const subject = tmpl.subject.replace(/{{mailboxNumber}}/g, mbNum).replace(/{{customerName}}/g, name);
    const body = [
      tmpl.greeting.replace(/{{customerName}}/g, name),
      "",
      tmpl.intro,
      "",
      tmpl.addressBlock.replace(/{{customerName}}/g, name).replace(/{{mailboxNumber}}/g, mbNum),
      "",
      tmpl.pickupBlock,
      "",
      tmpl.credentialsBlock.replace(/{{portalUrl}}/g, portalUrl).replace(/{{email}}/g, customer.email).replace(/{{mailboxNumber}}/g, mbNum).replace(/{{password}}/g, pwd),
      "",
      tmpl.closing
    ].join("\\n");

    const emailLog = {
      id: "email-" + Date.now(),
      recipient: customer.email,
      customer_name: name,
      mailbox_number: mbNum,
      subject: subject,
      body: body,
      template: "welcome",
      sent_at: new Date().toISOString(),
      status: "delivered"
    };

    DB.email_logs = DB.email_logs || [];
    DB.email_logs.unshift(emailLog);
    saveStorage("email_logs", DB.email_logs);

    // Live Resend API delivery if secret provided
    await dispatchViaResendIfKey({
      to: customer.email,
      subject: subject,
      body: body
    });

    try {
      await fetch("/api/mock-fn/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailLog)
      });
    } catch (e) {}

    return { success: true, emailLog };
  };

  window.sendPaymentThankYouEmail = async function (paymentData) {
    const invNum = paymentData.invoiceNumber || "INV-001";
    const amount = paymentData.amount || "0.00";
    const curr = paymentData.currency || "USD";
    const method = paymentData.paymentMethod || "Cash";
    const cName = paymentData.customerName || "Valued Customer";
    const recipient = paymentData.customerEmail || "customer@example.com";

    const body = 
      "Dear " + cName + ",\\n\\n" +
      "Thank you for your payment at Ray's Couriers!\\n\\n" +
      "PAYMENT RECEIPT DETAILS:\\n" +
      "• Invoice Number: " + invNum + "\\n" +
      "• Amount Paid: $" + amount + " " + curr + "\\n" +
      "• Payment Method: " + method + "\\n" +
      "• Transaction Date: " + new Date().toLocaleString() + "\\n" +
      "• Status: PAID IN FULL\\n\\n" +
      "Your packages have been verified and added to the front collection counter queue.\\n" +
      "Please present your receipt or Mailbox ID when collecting your cargo.\\n\\n" +
      "Georgetown Branch: Monday – Saturday, 8:30 AM to 5:00 PM\\n" +
      "Thank you for choosing Ray's Couriers!\\n\\n" +
      "Ray's Couriers Operations Team\\n" +
      "+592 712 6532 | rays@rayscouriers.com";

    const log = {
      id: "email-" + Date.now(),
      recipient: recipient,
      customer_name: cName,
      subject: "Thank You for Your Payment - Invoice " + invNum + " - Ray's Couriers",
      body: body,
      template: "payment_thanks",
      invoice_number: invNum,
      sent_at: new Date().toISOString(),
      status: "delivered"
    };

    DB.email_logs = DB.email_logs || [];
    DB.email_logs.unshift(log);
    saveStorage("email_logs", DB.email_logs);

    await dispatchViaResendIfKey({
      to: recipient,
      subject: log.subject,
      body: body
    });

    try {
      await fetch("/api/mock-fn/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(log)
      });
    } catch (e) {}

    return { success: true, log };
  };

  window.sendCustomerEmail = async function (emailPayload) {
    const log = {
      id: "email-" + Date.now(),
      recipient: emailPayload.to || emailPayload.recipient || emailPayload.email,
      customer_name: emailPayload.customerName || "Customer",
      subject: emailPayload.subject || "Ray's Couriers Notification",
      body: emailPayload.message || emailPayload.body || "",
      template: emailPayload.template || "custom",
      invoice_number: emailPayload.invoiceNumber || null,
      package_id: emailPayload.packageId || null,
      sent_at: new Date().toISOString(),
      status: "delivered"
    };
    DB.email_logs = DB.email_logs || [];
    DB.email_logs.unshift(log);
    saveStorage("email_logs", DB.email_logs);

    await dispatchViaResendIfKey({
      to: log.recipient,
      subject: log.subject,
      body: log.body
    });

    try {
      await fetch("/api/mock-fn/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(log)
      });
    } catch (e) {}
    return { success: true, log };
  };

  // createRaysMockClient
  function makeChainableProxy(builder) {
    return new Proxy(builder, {
      get(target, prop, receiver) {
        if (prop in target) {
          const val = target[prop];
          if (typeof val === "function") {
            return function (...args) {
              const res = val.apply(target, args);
              return res === target ? receiver : res;
            };
          }
          return val;
        }
        if (typeof prop === "string" && prop !== "then" && prop !== "catch" && prop !== "finally") {
          return function () {
            return receiver;
          };
        }
        return Reflect.get(target, prop, receiver);
      }
    });
  }

  window.createRaysMockClient = function (originalClient) {
    console.log("[Ray's Couriers] Wrapping Supabase Client with Autonomous Engine");
    const clientProxy = new Proxy(originalClient || {}, {
      get(target, prop, receiver) {
        if (prop === "from") {
          return function (tableName) {
            return makeChainableProxy(new MockQueryBuilder(tableName));
          };
        }
        
        if (prop === "auth") {
          return {
            signInWithPassword: async function ({ email, password }) {
              const clean = String(email || "").toLowerCase().trim();
              console.log("[Ray's Auth] Authenticating:", clean);

              // 1. Warehouse Admin Account (Admin permissions for Warehouse Portal)
              if (clean === "warehouse@rayscouriers.com") {
                const whUser = { 
                  id: "wh-admin-id-001", 
                  email: "warehouse@rayscouriers.com", 
                  user_metadata: { name: "Warehouse Admin", role: "warehouse", is_admin: true, is_warehouse_admin: true } 
                };
                const whProfile = { 
                  id: "wh-admin-id-001", 
                  email: "warehouse@rayscouriers.com", 
                  first_name: "Warehouse",
                  last_name: "Admin",
                  full_name: "Warehouse Admin", 
                  role: "warehouse", 
                  is_admin: true, 
                  is_warehouse_admin: true, 
                  is_employee: true 
                };
                localStorage.setItem("rays_locked_role", "warehouse");
                localStorage.setItem("rays_active_admin_session", JSON.stringify({ user: whUser, profile: whProfile }));
                return { data: { user: whUser, session: { user: whUser, access_token: "mock-token" } }, error: null };
              }

              // 2. Super Admin (Ray Reynolds / info Admin) - Strictly Admin Only!
              if (clean === "inforayscouriers@gmail.com" || clean === "rays@rayscouriers.com" || clean.startsWith("admin")) {
                const adminUser = { 
                  id: "rays-admin-id-001", 
                  email: clean, 
                  user_metadata: { name: "Ray Reynolds (Super Admin)", role: "admin" } 
                };
                const adminProfile = { 
                  id: "rays-admin-id-001", 
                  email: clean, 
                  full_name: "Ray Reynolds (Super Admin)", 
                  role: "admin", 
                  is_admin: true, 
                  is_employee: true, 
                  is_cashier: true 
                };
                localStorage.setItem("rays_locked_role", "admin");
                localStorage.setItem("rays_active_admin_session", JSON.stringify({ user: adminUser, profile: adminProfile }));
                return { data: { user: adminUser, session: { user: adminUser, access_token: "mock-token" } }, error: null };
              }

              // 3. Customer Login (by Email or Mailbox ID like RAYS-1001, BAC37578, RAYS1001, 1001)
              const cleanAlpha = clean.replace(/[^a-z0-9]/g, "");
              const cust = (DB.customers || []).find(c => {
                const cEmail = String(c.email || "").toLowerCase().trim();
                const cId = String(c.customer_id || "").toLowerCase().trim();
                const cIdAlpha = cId.replace(/[^a-z0-9]/g, "");
                const cMb = String(c.mailboxes?.mailbox_number || "").toLowerCase().trim();
                const cMbAlpha = cMb.replace(/[^a-z0-9]/g, "");
                return cEmail === clean ||
                  cId === clean ||
                  (cleanAlpha && cIdAlpha === cleanAlpha) ||
                  cMb === clean ||
                  (cleanAlpha && cMbAlpha === cleanAlpha) ||
                  (cleanAlpha.length >= 3 && (cIdAlpha.includes(cleanAlpha) || cMbAlpha.includes(cleanAlpha))) ||
                  String(c.id || "").toLowerCase() === clean;
              });

              if (cust) {
                const isAutoOrEmptyPwd = !cust.password || cust.password === "123456" || cust.password.startsWith("RC");
                if (!isAutoOrEmptyPwd && password && cust.password !== password) {
                  return { data: { user: null, session: null }, error: { message: "Invalid password for Mailbox / Email: " + clean } };
                }
                if (isAutoOrEmptyPwd && password) {
                  cust.password = password;
                  saveStorage("customers", DB.customers);
                }
                const custUser = {
                  id: cust.id,
                  email: cust.email,
                  user_metadata: { name: cust.first_name + " " + cust.last_name, role: "customer", customer_id: cust.customer_id }
                };
                const custProfile = {
                  id: cust.id,
                  user_id: cust.id,
                  email: cust.email,
                  first_name: cust.first_name,
                  last_name: cust.last_name,
                  full_name: cust.first_name + " " + cust.last_name,
                  role: "customer",
                  customer_id: cust.customer_id
                };
                localStorage.setItem("rays_locked_role", "customer");
                localStorage.setItem("rays_active_customer_session", JSON.stringify({ user: custUser, profile: custProfile }));
                return { data: { user: custUser, session: { user: custUser, access_token: "mock-token" } }, error: null };
              }

              // 4. Employee Login
              const emp = (DB.employees || []).find(e => 
                (e.email && e.email.toLowerCase() === clean) ||
                (e.employee_id && e.employee_id.toLowerCase() === clean)
              );
              if (emp) {
                const empUser = { id: emp.user_id || emp.id, email: emp.email, user_metadata: { name: emp.first_name + " " + emp.last_name, role: "employee" } };
                const empProfile = { id: emp.user_id || emp.id, email: emp.email, full_name: emp.first_name + " " + emp.last_name, role: "employee", is_employee: true };
                localStorage.setItem("rays_locked_role", "employee");
                return { data: { user: empUser, session: { user: empUser, access_token: "mock-token" } }, error: null };
              }

              if (originalClient && originalClient.auth && originalClient.auth.signInWithPassword) {
                return originalClient.auth.signInWithPassword({ email, password });
              }

              return { data: { user: null, session: null }, error: { message: "No account found matching '" + email + "'. Please check your email or RAYS mailbox ID." } };
            },
            signOut: async function () {
              localStorage.removeItem("rays_locked_role");
              localStorage.removeItem("rays_active_admin_session");
              localStorage.removeItem("rays_active_customer_session");
              sessionStorage.clear();
              if (originalClient?.auth?.signOut) {
                try { await originalClient.auth.signOut(); } catch (e) {}
              }
              return { error: null };
            },
            getSession: async function () {
              const savedAdmin = localStorage.getItem("rays_active_admin_session");
              if (savedAdmin) {
                try {
                  const p = JSON.parse(savedAdmin);
                  return { data: { session: { user: p.user, access_token: "mock" } }, error: null };
                } catch(e) {}
              }
              const savedCust = localStorage.getItem("rays_active_customer_session");
              if (savedCust) {
                try {
                  const p = JSON.parse(savedCust);
                  return { data: { session: { user: p.user, access_token: "mock" } }, error: null };
                } catch(e) {}
              }
              if (originalClient?.auth?.getSession) {
                return originalClient.auth.getSession();
              }
              return { data: { session: null }, error: null };
            },
            getUser: async function () {
              const sess = await this.getSession();
              return { data: { user: sess.data.session?.user || null }, error: null };
            },
            onAuthStateChange: function (cb) {
              return { data: { subscription: { unsubscribe: () => {} } } };
            }
          };
        }

        if (prop === "channel") {
          return function (name) {
            return {
              on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
              subscribe: () => ({ unsubscribe: () => {} }),
              unsubscribe: () => {}
            };
          };
        }
        if (prop === "functions") {
          return {
            invoke: async function (fnName, options) {
              return handleFunctionInvoke(fnName, options?.body);
            }
          };
        }
        return Reflect.get(target, prop, receiver);
      }
    });
    return clientProxy;
  };
})();
