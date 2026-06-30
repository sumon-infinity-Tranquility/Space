const firebaseConfig = window.SPACE_FIREBASE_CONFIG || {};
const hasFirebaseConfig = Object.values(firebaseConfig).some(Boolean) && firebaseConfig.projectId;

const demoListings = [
  {
    id: "active-banani-office",
    brand: "Active",
    title: "Banani operational office floor",
    location: "Banani, Dhaka",
    price: 185000,
    units: "2,800 sqft / 36 desks",
    contact: "+880 1711 000001",
    lat: 23.7937,
    lng: 90.4066,
    description: "Verified commercial floor with lift, backup power, washrooms, and transparent utility terms."
  },
  {
    id: "haven-gulshan-family",
    brand: "Haven",
    title: "Gulshan family apartment",
    location: "Gulshan 1, Dhaka",
    price: 95000,
    units: "3 bed / 3 bath",
    contact: "+880 1711 000002",
    lat: 23.7806,
    lng: 90.4193,
    description: "Residential home with security, parking, reliable gas line, and easy school access."
  },
  {
    id: "sleep-dhanmondi-studio",
    brand: "Sleep",
    title: "Dhanmondi student studio",
    location: "Dhanmondi, Dhaka",
    price: 18000,
    units: "Private room / shared kitchen",
    contact: "+880 1711 000003",
    lat: 23.7461,
    lng: 90.3742,
    description: "Simple furnished stay for students and young professionals near transport and daily essentials."
  },
  {
    id: "active-tejgaon-warehouse",
    brand: "Active",
    title: "Tejgaon small warehouse",
    location: "Tejgaon, Dhaka",
    price: 135000,
    units: "4,200 sqft",
    contact: "+880 1711 000004",
    lat: 23.7622,
    lng: 90.3917,
    description: "Ground-level factory and storage unit with truck access, electricity details, and operational support."
  }
];

let listings = [];
let inquiries = [];
let activeFilter = "all";
let db = null;
let firebaseApi = null;

const nodes = {
  listingGrid: document.querySelector("#listingGrid"),
  listingCount: document.querySelector("#listingCount"),
  listingForm: document.querySelector("#listingForm"),
  inquiryForm: document.querySelector("#inquiryForm"),
  inquiryListing: document.querySelector("#inquiryListing"),
  savedInquiries: document.querySelector("#savedInquiries"),
  searchInput: document.querySelector("#searchInput"),
  backendStatus: document.querySelector("#backendStatus"),
  mapTitle: document.querySelector("#mapTitle"),
  mapDescription: document.querySelector("#mapDescription"),
  selectedBrand: document.querySelector("#selectedBrand"),
  selectedPrice: document.querySelector("#selectedPrice"),
  selectedContact: document.querySelector("#selectedContact"),
  mapFrame: document.querySelector("#mapFrame"),
  seedDataButton: document.querySelector("#seedDataButton"),
  template: document.querySelector("#listingCardTemplate")
};

async function boot() {
  await connectFirebase();
  await loadListings();
  loadInquiries();
  wireEvents();
  render();
  if (listings[0]) selectListing(listings[0].id, false);
}

async function connectFirebase() {
  if (!hasFirebaseConfig) {
    nodes.backendStatus.textContent = "Local mode";
    return;
  }

  try {
    const appModule = await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js");
    const firestoreModule = await import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js");
    const app = appModule.initializeApp(firebaseConfig);
    db = firestoreModule.getFirestore(app);
    firebaseApi = firestoreModule;
    nodes.backendStatus.textContent = "Firebase connected";
  } catch (error) {
    console.warn("Firebase connection failed, using local storage.", error);
    nodes.backendStatus.textContent = "Local fallback";
  }
}

async function loadListings() {
  if (db && firebaseApi) {
    const snapshot = await firebaseApi.getDocs(firebaseApi.collection(db, "spaceListings"));
    listings = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  if (!listings.length) {
    listings = readLocal("spaceListings", demoListings);
  }
}

function loadInquiries() {
  inquiries = readLocal("spaceInquiries", []);
}

function wireEvents() {
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;
      document.querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("active", item === button));
      renderListings();
    });
  });

  nodes.searchInput.addEventListener("input", renderListings);
  nodes.listingForm.addEventListener("submit", saveListing);
  nodes.inquiryForm.addEventListener("submit", saveInquiry);
  nodes.seedDataButton.addEventListener("click", seedDemoData);
}

function render() {
  renderListings();
  renderInquiryOptions();
  renderInquiries();
  nodes.listingCount.textContent = listings.length.toString();
}

function renderListings() {
  const query = nodes.searchInput.value.trim().toLowerCase();
  const filtered = listings.filter((listing) => {
    const matchesFilter = activeFilter === "all" || listing.brand === activeFilter;
    const content = `${listing.brand} ${listing.title} ${listing.location} ${listing.description} ${listing.units}`.toLowerCase();
    return matchesFilter && content.includes(query);
  });

  nodes.listingGrid.replaceChildren();

  if (!filtered.length) {
    const empty = document.createElement("p");
    empty.className = "description";
    empty.textContent = "No listings match that search yet.";
    nodes.listingGrid.append(empty);
    return;
  }

  filtered.forEach((listing) => {
    const fragment = nodes.template.content.cloneNode(true);
    const card = fragment.querySelector(".listing-card");
    const media = fragment.querySelector(".card-media");
    const badge = fragment.querySelector(".badge");
    const price = fragment.querySelector(".price");
    const title = fragment.querySelector("h3");
    const location = fragment.querySelector(".location");
    const description = fragment.querySelector(".description");
    const units = fragment.querySelector(".units");
    const button = fragment.querySelector(".map-button");

    media.classList.add(listing.brand);
    badge.textContent = listing.brand;
    price.textContent = formatPrice(listing.price);
    title.textContent = listing.title;
    location.textContent = listing.location;
    description.textContent = listing.description;
    units.textContent = listing.units;
    button.addEventListener("click", () => selectListing(listing.id));
    card.addEventListener("dblclick", () => selectListing(listing.id));
    nodes.listingGrid.append(fragment);
  });
}

function renderInquiryOptions() {
  nodes.inquiryListing.replaceChildren();
  listings.forEach((listing) => {
    const option = document.createElement("option");
    option.value = listing.id;
    option.textContent = `${listing.brand} - ${listing.title}`;
    nodes.inquiryListing.append(option);
  });
}

function renderInquiries() {
  nodes.savedInquiries.replaceChildren();
  inquiries.slice(0, 4).forEach((inquiry) => {
    const listing = listings.find((item) => item.id === inquiry.listingId);
    const item = document.createElement("article");
    item.innerHTML = `<strong>${escapeHtml(inquiry.name)}</strong><br><span>${escapeHtml(listing?.title || "Selected space")}</span><br><small>${escapeHtml(inquiry.contact)}</small>`;
    nodes.savedInquiries.append(item);
  });
}

function selectListing(id, shouldScroll = true) {
  const listing = listings.find((item) => item.id === id);
  if (!listing) return;

  nodes.mapTitle.textContent = listing.title;
  nodes.mapDescription.textContent = `${listing.location}. ${listing.description}`;
  nodes.selectedBrand.textContent = listing.brand;
  nodes.selectedPrice.textContent = formatPrice(listing.price);
  nodes.selectedContact.textContent = listing.contact;
  nodes.mapFrame.src = `https://www.google.com/maps?q=${encodeURIComponent(`${listing.lat},${listing.lng}`)}&output=embed`;
  nodes.inquiryListing.value = listing.id;
  if (shouldScroll) {
    document.querySelector("#map").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

async function saveListing(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const listing = {
    brand: form.get("brand"),
    title: form.get("title").trim(),
    location: form.get("location").trim(),
    price: Number(form.get("price")),
    units: form.get("units").trim(),
    contact: form.get("contact").trim(),
    lat: Number(form.get("lat")),
    lng: Number(form.get("lng")),
    description: form.get("description").trim(),
    createdAt: new Date().toISOString()
  };

  if (db && firebaseApi) {
    const docRef = await firebaseApi.addDoc(firebaseApi.collection(db, "spaceListings"), listing);
    listing.id = docRef.id;
  } else {
    listing.id = crypto.randomUUID();
  }

  listings = [listing, ...listings];
  writeLocal("spaceListings", listings);
  event.currentTarget.reset();
  render();
  selectListing(listing.id);
}

async function saveInquiry(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const inquiry = {
    id: crypto.randomUUID(),
    name: form.get("name").trim(),
    contact: form.get("contact").trim(),
    listingId: form.get("listingId"),
    message: form.get("message").trim(),
    createdAt: new Date().toISOString()
  };

  if (db && firebaseApi) {
    await firebaseApi.addDoc(firebaseApi.collection(db, "spaceInquiries"), inquiry);
  }

  inquiries = [inquiry, ...inquiries];
  writeLocal("spaceInquiries", inquiries);
  event.currentTarget.reset();
  renderInquiries();
}

async function seedDemoData() {
  listings = demoListings.map((listing) => ({ ...listing }));

  if (db && firebaseApi) {
    await Promise.all(
      listings.map((listing) => firebaseApi.setDoc(firebaseApi.doc(db, "spaceListings", listing.id), listing))
    );
  }

  writeLocal("spaceListings", listings);
  render();
  selectListing(listings[0].id);
}

function formatPrice(value) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function readLocal(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

boot();
