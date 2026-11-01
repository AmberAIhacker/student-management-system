const DEPARTMENTS = ["Computer Science", "Business", "Design", "Engineering", "Psychology", "Biology"];
const STORAGE_KEY = "campusly.students.v1";
const AVATAR_COLORS = [
  ["#f3e7df", "#a76b4e"], ["#e8e5fb", "#6f61bb"], ["#e2f2eb", "#458667"],
  ["#f8e9ed", "#b8647b"], ["#e2edf7", "#547fa4"], ["#f5eddb", "#a18440"]
];
const SEED_STUDENTS = [
  { studentId: "STU-2025-001", name: "Olivia Rhye", department: "Computer Science", semester: 5, email: "olivia.rhye@university.edu", phone: "+1 (555) 010-2841", address: "Brooklyn, New York", status: "Active", enrolledAt: "2025-09-02" },
  { studentId: "STU-2025-002", name: "Phoenix Baker", department: "Business", semester: 3, email: "phoenix.baker@university.edu", phone: "+1 (555) 010-3842", address: "Austin, Texas", status: "Active", enrolledAt: "2025-08-28" },
  { studentId: "STU-2025-003", name: "Lana Steiner", department: "Design", semester: 6, email: "lana.steiner@university.edu", phone: "+1 (555) 010-5938", address: "Portland, Oregon", status: "Active", enrolledAt: "2025-08-19" },
  { studentId: "STU-2025-004", name: "Demi Wilkinson", department: "Engineering", semester: 2, email: "demi.wilkinson@university.edu", phone: "+1 (555) 010-1175", address: "Denver, Colorado", status: "Active", enrolledAt: "2025-08-12" },
  { studentId: "STU-2025-005", name: "Candice Wu", department: "Psychology", semester: 4, email: "candice.wu@university.edu", phone: "+1 (555) 010-6653", address: "Seattle, Washington", status: "Active", enrolledAt: "2025-08-06" },
  { studentId: "STU-2025-006", name: "Natali Craig", department: "Biology", semester: 7, email: "natali.craig@university.edu", phone: "+1 (555) 010-4219", address: "San Diego, California", status: "Active", enrolledAt: "2025-07-26" },
  { studentId: "STU-2025-007", name: "Drew Cano", department: "Computer Science", semester: 1, email: "drew.cano@university.edu", phone: "+1 (555) 010-8346", address: "Chicago, Illinois", status: "Active", enrolledAt: "2025-10-04" },
  { studentId: "STU-2025-008", name: "Orlando Diggs", department: "Business", semester: 8, email: "orlando.diggs@university.edu", phone: "+1 (555) 010-9021", address: "Miami, Florida", status: "Active", enrolledAt: "2025-10-18" }
];

class Person {
  constructor(name, email, phone, address = "") {
    this.name = name;
    this.email = email;
    this.phone = phone;
    this.address = address;
  }
}

class Student extends Person {
  #studentId;

  constructor({ studentId, name, department, semester, email, phone, address = "", status = "Active", enrolledAt = new Date().toISOString().slice(0, 10) }) {
    super(name, email, phone, address);
    this.#studentId = studentId;
    this.department = department;
    this.semester = Number(semester);
    this.status = status;
    this.enrolledAt = enrolledAt;
  }

  get studentId() {
    return this.#studentId;
  }

  toJSON() {
    return {
      studentId: this.#studentId, name: this.name, department: this.department,
      semester: this.semester, email: this.email, phone: this.phone,
      address: this.address, status: this.status, enrolledAt: this.enrolledAt
    };
  }
}

class StudentRepository {
  #students = [];
  #storage;

  constructor(storage) {
    this.#storage = storage;
    this.#students = this.#load();
  }

  #load() {
    try {
      const saved = this.#storage.getItem(STORAGE_KEY);
      if (saved === null) {
        const initialStudents = SEED_STUDENTS.map((record) => new Student(record));
        this.#persist(initialStudents);
        return initialStudents;
      }
      const records = JSON.parse(saved);
      if (!Array.isArray(records) || !records.every(StudentRepository.#isStudentRecord)) {
        throw new Error("Saved student data has an invalid format.");
      }
      return records.map((record) => new Student(record));
    } catch (error) {
      throw new Error(`Could not load student records: ${error.message}`);
    }
  }

  static #isStudentRecord(record) {
    return record && typeof record === "object"
      && typeof record.studentId === "string" && record.studentId.trim()
      && typeof record.name === "string" && record.name.trim()
      && DEPARTMENTS.includes(record.department)
      && Number.isInteger(Number(record.semester)) && Number(record.semester) >= 1 && Number(record.semester) <= 8
      && typeof record.email === "string" && typeof record.phone === "string";
  }

  #persist(students = this.#students) {
    this.#storage.setItem(STORAGE_KEY, JSON.stringify(students));
  }

  getAll() {
    return this.#students.map((student) => student.toJSON());
  }

  save(data, originalId = "") {
    const newId = data.studentId.trim();
    const duplicate = this.#students.some((student) => student.studentId.toLowerCase() === newId.toLowerCase() && student.studentId.toLowerCase() !== originalId.toLowerCase());
    if (duplicate) throw new Error("That student ID is already in use.");
    const next = new Student(data);
    const index = this.#students.findIndex((student) => student.studentId === originalId);
    if (originalId && index === -1) throw new Error("This student could not be found. Refresh and try again.");
    const updated = [...this.#students];
    if (index >= 0) updated[index] = next;
    else updated.unshift(next);
    this.#persist(updated);
    this.#students = updated;
    return next.toJSON();
  }

  delete(studentId) {
    const updated = this.#students.filter((student) => student.studentId !== studentId);
    if (updated.length === this.#students.length) throw new Error("This student could not be found.");
    this.#persist(updated);
    this.#students = updated;
  }

  import(records) {
    if (!Array.isArray(records) || !records.length || !records.every(StudentRepository.#isStudentRecord)) {
      throw new Error("Choose a JSON file containing a non-empty array of valid student records.");
    }
    const ids = records.map((record) => record.studentId.trim().toLowerCase());
    if (new Set(ids).size !== ids.length) throw new Error("The file contains duplicate student IDs.");
    const merged = new Map(this.#students.map((student) => [student.studentId.toLowerCase(), student]));
    for (const record of records) merged.set(record.studentId.trim().toLowerCase(), new Student(record));
    const updated = Array.from(merged.values());
    this.#persist(updated);
    this.#students = updated;
    return records.length;
  }
}

const repository = new StudentRepository(window.localStorage);
const tableBody = document.querySelector("#student-table-body");
const searchInput = document.querySelector("#search-input");
const departmentFilter = document.querySelector("#department-filter");
const semesterFilter = document.querySelector("#semester-filter");
const modal = document.querySelector("#student-modal");
const form = document.querySelector("#student-form");
const formError = document.querySelector("#form-error");
let sortAscending = true;
let toastTimeout;

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function avatarStyle(name) {
  const index = Array.from(name).reduce((sum, character) => sum + character.charCodeAt(0), 0) % AVATAR_COLORS.length;
  const [background, color] = AVATAR_COLORS[index];
  return `background:${background};color:${color}`;
}

function getVisibleStudents() {
  const query = searchInput.value.trim().toLowerCase();
  const department = departmentFilter.value;
  const semester = semesterFilter.value;
  return repository.getAll()
    .filter((student) => !department || student.department === department)
    .filter((student) => !semester || String(student.semester) === semester)
    .filter((student) => !query || [student.name, student.studentId, student.department, student.email, student.phone, student.address].some((value) => value.toLowerCase().includes(query)))
    .sort((a, b) => sortAscending ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
}

function renderStudents() {
  const students = repository.getAll();
  const visible = getVisibleStudents();
  tableBody.innerHTML = visible.map((student) => `
    <tr>
      <td><div class="student-profile"><span class="student-avatar" style="${avatarStyle(student.name)}">${escapeHTML(initials(student.name))}</span><div><div class="student-name">${escapeHTML(student.name)}</div><div class="student-email">${escapeHTML(student.email)}</div></div></div></td>
      <td><span class="student-id">${escapeHTML(student.studentId)}</span></td>
      <td><span class="department-chip">${escapeHTML(student.department)}</span></td>
      <td><span class="semester-label">Semester ${student.semester}</span></td>
      <td><div class="contact-cell"><span>${escapeHTML(student.phone)}</span><small>${escapeHTML(student.address || "Address not provided")}</small></div></td>
      <td><span class="status-badge">${escapeHTML(student.status)}</span></td>
      <td><span class="row-actions"><button class="row-action edit" type="button" data-edit="${escapeHTML(student.studentId)}" aria-label="Edit ${escapeHTML(student.name)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5 5 5M4 20l4.3-.9L19 8.4 15.6 5 4.9 15.7 4 20Z"/></svg></button><button class="row-action delete" type="button" data-delete="${escapeHTML(student.studentId)}" aria-label="Delete ${escapeHTML(student.name)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6m4-6v6M5 7l1 13h12l1-13M9 7V4h6v3"/></svg></button></span></td>
    </tr>`).join("");
  document.querySelector("#empty-state").hidden = visible.length > 0;
  document.querySelector(".student-table").hidden = visible.length === 0;
  document.querySelector("#result-count").textContent = `${visible.length} ${visible.length === 1 ? "record" : "records"}`;
  document.querySelector("#table-summary").textContent = `Showing ${visible.length} of ${students.length} students`;
  document.querySelector("#total-students").textContent = String(students.length).padStart(2, "0");
  document.querySelector("#total-departments").textContent = String(new Set(students.map((student) => student.department)).size).padStart(2, "0");
  document.querySelector("#active-students").textContent = String(students.filter((student) => student.status === "Active").length).padStart(2, "0");
  const currentMonth = new Date().toISOString().slice(0, 7);
  document.querySelector("#new-enrollments").textContent = String(students.filter((student) => student.enrolledAt.startsWith(currentMonth)).length).padStart(2, "0");
  document.querySelector("#nav-count").textContent = String(students.length);
  updateDepartmentOptions(students);
}

function updateDepartmentOptions(students) {
  const selectedFilter = departmentFilter.value;
  const presentDepartments = [...new Set(students.map((student) => student.department))].sort();
  departmentFilter.innerHTML = `<option value="">All departments</option>${presentDepartments.map((department) => `<option value="${escapeHTML(department)}">${escapeHTML(department)}</option>`).join("")}`;
  if (presentDepartments.includes(selectedFilter)) departmentFilter.value = selectedFilter;
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  document.querySelector("#toast-message").textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("visible"), 2800);
}

function openModal(student = null) {
  form.reset();
  formError.hidden = true;
  formError.textContent = "";
  document.querySelector("#student-record-id").value = student ? student.studentId : "";
  document.querySelector("#modal-title").textContent = student ? "Edit student" : "Add a student";
  document.querySelector("#save-student").textContent = student ? "Save changes" : "Add student";
  const departmentSelect = document.querySelector("#student-department");
  departmentSelect.innerHTML = `<option value="" disabled>Select department</option>${DEPARTMENTS.map((department) => `<option value="${escapeHTML(department)}">${escapeHTML(department)}</option>`).join("")}`;
  if (student) {
    document.querySelector("#student-name").value = student.name;
    document.querySelector("#student-id").value = student.studentId;
    departmentSelect.value = student.department;
    document.querySelector("#student-semester").value = String(student.semester);
    document.querySelector("#student-email").value = student.email;
    document.querySelector("#student-phone").value = student.phone;
    document.querySelector("#student-address").value = student.address;
  }
  modal.hidden = false;
  document.body.style.overflow = "hidden";
  document.querySelector("#student-name").focus();
}

function closeModal() {
  modal.hidden = true;
  document.body.style.overflow = "";
}

function resetFilters() {
  searchInput.value = "";
  departmentFilter.value = "";
  semesterFilter.value = "";
  renderStudents();
}

document.querySelector("#add-student-button").addEventListener("click", () => openModal());
document.querySelector("#modal-close").addEventListener("click", closeModal);
document.querySelector("#cancel-modal").addEventListener("click", closeModal);
modal.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modal.hidden) closeModal();
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    searchInput.focus();
  }
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const originalId = document.querySelector("#student-record-id").value;
  const existing = originalId ? repository.getAll().find((student) => student.studentId === originalId) : null;
  const data = Object.fromEntries(new FormData(form).entries());
  try {
    repository.save({ ...data, status: existing?.status || "Active", enrolledAt: existing?.enrolledAt || new Date().toISOString().slice(0, 10) }, originalId);
    closeModal();
    renderStudents();
    showToast(originalId ? "Student details updated." : "Student added to the directory.");
  } catch (error) {
    formError.textContent = error.message;
    formError.hidden = false;
  }
});

tableBody.addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");
  if (editButton) {
    const student = repository.getAll().find((record) => record.studentId === editButton.dataset.edit);
    if (student) openModal(student);
  }
  if (deleteButton) {
    const student = repository.getAll().find((record) => record.studentId === deleteButton.dataset.delete);
    if (student && window.confirm(`Delete ${student.name} (${student.studentId})? This cannot be undone.`)) {
      try {
        repository.delete(student.studentId);
        renderStudents();
        showToast("Student record deleted.");
      } catch (error) {
        showToast(error.message);
      }
    }
  }
});

searchInput.addEventListener("input", renderStudents);
departmentFilter.addEventListener("change", renderStudents);
semesterFilter.addEventListener("change", renderStudents);
document.querySelector("#reset-filters").addEventListener("click", resetFilters);
document.querySelector("#empty-reset").addEventListener("click", resetFilters);
document.querySelector(".sort-button").addEventListener("click", () => {
  sortAscending = !sortAscending;
  document.querySelector(".sort-button span").textContent = sortAscending ? "↕" : "↕";
  renderStudents();
});

document.querySelector("#export-button").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(repository.getAll(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `campusly-students-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("Student records exported as JSON.");
});

document.querySelector("#import-button").addEventListener("click", () => document.querySelector("#import-file").click());
document.querySelector("#import-file").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const records = JSON.parse(await file.text());
    const imported = repository.import(records);
    renderStudents();
    showToast(`${imported} student ${imported === 1 ? "record" : "records"} imported.`);
  } catch (error) {
    window.alert(`Import failed: ${error.message}`);
  } finally {
    event.target.value = "";
  }
});

document.querySelector("#mobile-menu").addEventListener("click", () => {
  document.querySelector("#sidebar").classList.toggle("is-open");
});
document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".nav-link").forEach((item) => item.classList.remove("active"));
    link.classList.add("active");
    const label = link.querySelector("span").textContent;
    document.querySelector("#breadcrumb-current").textContent = label;
    document.querySelector("#sidebar").classList.remove("is-open");
    if (link.dataset.page !== "students") showToast(`${label} view is coming soon.`);
  });
});
document.querySelector("#help-button").addEventListener("click", () => showToast("Contact your campus administrator for support."));

renderStudents();
