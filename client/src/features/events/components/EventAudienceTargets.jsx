import "../styles/eventAudienceTargets.css";

const DEPARTMENTS = [
  "B. Tech in CS & AI",
  "B. Tech in IT",
  "IT Engineering",
  "Civil Engineering",
];
const SEMESTERS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

const EventAudienceTargets = ({ value = [], onChange }) => {
  const selected = Array.isArray(value) ? value : [];

  const addDepartment = (department) => {
    if (selected.some((item) => item.department === department)) return;
    onChange([...selected, { department, semesters: [] }]);
  };

  const removeDepartment = (department) =>
    onChange(selected.filter((item) => item.department !== department));

  const toggleSemester = (department, semester) => {
    onChange(selected.map((item) => {
      if (item.department !== department) return item;
      const semesters = new Set(item.semesters || []);
      if (semesters.has(semester)) semesters.delete(semester);
      else semesters.add(semester);
      return { ...item, semesters: SEMESTERS.filter((option) => semesters.has(option)) };
    }));
  };

  const availableDepartments = DEPARTMENTS.filter(
    (department) => !selected.some((item) => item.department === department),
  );

  return (
    <section className="audience-targets">
      <div className="audience-targets-heading">
        <div>
          <h3>Target departments and semesters</h3>
          <p>Leave this empty to make the event available to all students.</p>
        </div>
        {availableDepartments.length > 0 && (
          <select
            aria-label="Add target department"
            value=""
            onChange={(event) => addDepartment(event.target.value)}
          >
            <option value="" disabled>Add department</option>
            {availableDepartments.map((department) => (
              <option key={department} value={department}>{department}</option>
            ))}
          </select>
        )}
      </div>

      {selected.length === 0 ? (
        <p className="audience-targets-empty">Available to every department and semester.</p>
      ) : (
        <div className="audience-target-list">
          {selected.map(({ department, semesters = [] }) => (
            <fieldset className="audience-department" key={department}>
              <legend>{department}</legend>
              <button type="button" className="audience-remove" onClick={() => removeDepartment(department)}>
                Remove department
              </button>
              <div className="semester-options">
                {SEMESTERS.map((semester) => (
                  <label className="semester-option" key={semester}>
                    <input
                      type="checkbox"
                      checked={semesters.includes(semester)}
                      onChange={() => toggleSemester(department, semester)}
                    />
                    <span>{semester}</span>
                  </label>
                ))}
              </div>
              <small>{semesters.length ? `Selected: ${semesters.join(", ")}` : "Select at least one semester."}</small>
            </fieldset>
          ))}
        </div>
      )}
    </section>
  );
};

export default EventAudienceTargets;
