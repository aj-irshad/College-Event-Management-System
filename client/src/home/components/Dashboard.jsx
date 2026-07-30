const Dashboard = ({ isAdmin }) => {
  return (
    <div>
      <h1>Dashboard</h1>
      {isAdmin === "Admin" ? <p>Hello, Admin</p> : <p>Hello, User</p>}
    </div>
  );
};

export default Dashboard;
