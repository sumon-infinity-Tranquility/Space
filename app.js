const firebaseConfig = window.SPACE_FIREBASE_CONFIG || {};
const hasFirebaseConfig = Object.values(firebaseConfig).some(Boolean) && firebaseConfig.projectId;
const registryListings = window.SPACE_REGISTRY_LISTINGS || [];

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
let authMode = "login";
let db = null;
let firebaseApi = null;

const nodes = {
  authScreen: document.querySelector("#authScreen"),
  appShell: document.querySelector("#appShell"),
  authForm: document.querySelector("#authForm"),
  authSubmit: document.querySelector("#authSubmit"),
  authStatus: document.querySelector("#authStatus"),
  logoutButton: document.querySelector("#logoutButton"),
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
  exactMapLink: document.querySelector("#exactMapLink"),
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
    const customListings = readLocal("spaceCustomListings", []);
    listings = [...customListings, ...getBaseListings()];
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
  document.querySelectorAll("[data-auth-mode]").forEach((button) => {
    button.addEventListener("click", () => setAuthMode(button.dataset.authMode));
  });
  nodes.authForm.addEventListener("submit", saveLogin);
  nodes.logoutButton.addEventListener("click", logout);
  nodes.listingForm.addEventListener("submit", saveListing);
  nodes.inquiryForm.addEventListener("submit", saveInquiry);
  nodes.seedDataButton.addEventListener("click", seedDemoData);
  renderLogin();
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
    const content = `${listing.brand} ${listing.title} ${listing.location} ${listing.description} ${listing.units} ${listing.sizeRange || ""} ${listing.status || ""}`.toLowerCase();
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
    if (listing.photoUrl) {
      const image = document.createElement("img");
      image.src = listing.photoUrl;
      image.alt = `${listing.title} photo`;
      image.loading = "lazy";
      media.append(image);
    }
    badge.textContent = listing.brand;
    price.textContent = formatPrice(listing.price);
    title.textContent = listing.title;
    location.textContent = listing.location;
    description.textContent = listing.description;
    units.textContent = listing.sizeRange || listing.units;
    if (listing.propertyLink) {
      const propertyLink = document.createElement("a");
      propertyLink.className = "property-link";
      propertyLink.href = listing.propertyLink;
      propertyLink.target = "_blank";
      propertyLink.rel = "noreferrer";
      propertyLink.textContent = "Property details";
      fragment.querySelector(".card-body").append(propertyLink);
    }
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
  nodes.selectedContact.textContent = [listing.contactName, listing.contact].filter(Boolean).join(" - ") || "-";
  const mapQuery = getMapQuery(listing);
  const exactLink = listing.mapLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;
  nodes.exactMapLink.href = exactLink;
  nodes.mapFrame.src = `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`;
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
    sizeRange: form.get("sizeRange"),
    sizeSqft: Number(form.get("sizeSqft")),
    units: `${Number(form.get("sizeSqft"))} sqft / ${form.get("sizeRange")}`,
    contact: form.get("contact").trim(),
    lat: Number(form.get("lat")),
    lng: Number(form.get("lng")),
    mapLink: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${form.get("lat")},${form.get("lng")}`)}`,
    propertyLink: form.get("propertyLink").trim(),
    photoUrl: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80",
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
  const customListings = readLocal("spaceCustomListings", []);
  writeLocal("spaceCustomListings", [listing, ...customListings]);
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
  listings = getBaseListings().map((listing) => ({ ...listing }));

  if (db && firebaseApi) {
    await Promise.all(
      listings.map((listing) => firebaseApi.setDoc(firebaseApi.doc(db, "spaceListings", listing.id), listing))
    );
  }

  writeLocal("spaceCustomListings", []);
  render();
  selectListing(listings[0].id);
}

function saveLogin(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const user = form.get("user").trim();
  localStorage.setItem("spaceUser", JSON.stringify({ user, mode: authMode, signedInAt: new Date().toISOString() }));
  event.currentTarget.reset();
  renderLogin();
  document.querySelector("#home").scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderLogin() {
  const session = readLocal("spaceUser", null);
  nodes.authScreen.classList.toggle("is-hidden", Boolean(session));
  nodes.appShell.classList.toggle("is-hidden", !session);
  nodes.authStatus.textContent = session ? `Signed in as ${session.user}` : "Enter your details to continue.";
}

function setAuthMode(mode) {
  authMode = mode;
  document.querySelectorAll("[data-auth-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.authMode === mode);
  });
  nodes.authSubmit.textContent = mode === "signin" ? "Sign in" : "Log in";
  nodes.authStatus.textContent = mode === "signin" ? "Create or confirm your Space access." : "Enter your details to continue.";
}

function logout() {
  localStorage.removeItem("spaceUser");
  renderLogin();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function getBaseListings() {
  return registryListings.length ? registryListings : demoListings;
}

function getMapQuery(listing) {
  if (Number.isFinite(Number(listing.lat)) && Number.isFinite(Number(listing.lng))) {
    return `${listing.lat},${listing.lng}`;
  }
  return `${listing.location}, Bangladesh`;
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
