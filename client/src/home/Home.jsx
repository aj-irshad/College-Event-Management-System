const Home = () => {
  // const navigate = useNavigate();
  // const [user, setUser] = useState(null);

  // useEffect(() => {
  //   const checkLogin = async () => {
  //     try {
  //       const response = await getProfile();
  //       setUser(response.data.user);
  //     } catch (error) {
  //       console.error(error.response?.data?.msg);

  //       if (error.response?.status === 401) {
  //         navigate("/login");
  //       }
  //     }
  //   };

  //   checkLogin();
  // }, [navigate]);

  return (
    <div>
      <h1>Home</h1>
    </div>
  );
};

export default Home;
