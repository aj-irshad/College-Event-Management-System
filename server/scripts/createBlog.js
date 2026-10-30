import dotenv from "dotenv";
import mongoose from "mongoose";
import Blog from "../model/blogs.js";

dotenv.config({ path: "./.env" });

const seedBlogs = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const blogs = [
      {
        title: "Highlights of Tech Fest 2026",
        description:
          "Our college Tech Fest brought together enthusiastic students for coding competitions, technical workshops, and exciting technology exhibitions. The event provided an excellent opportunity for students to showcase their technical skills, exchange ideas, and explore innovative solutions to real-world problems.",
        eventDate: new Date("2026-11-20T10:00:00"),
        blogImage: "",
      },
      {
        title: "Learning Full-Stack Web Development",
        description:
          "The Web Development Workshop introduced students to modern full-stack development using React, Node.js, Express, and MongoDB. Participants learned about frontend development, REST APIs, database integration, and the process of building practical web applications.",
        eventDate: new Date("2026-11-22T11:00:00"),
        blogImage: "",
      },
      {
        title: "Inter College Hackathon: Innovation in Action",
        description:
          "The Inter College Hackathon challenges students to collaborate, think creatively, and develop technology-driven solutions to real-world challenges. Participants work in teams, share ideas, and turn their concepts into working prototypes while strengthening their problem-solving and teamwork skills.",
        eventDate: new Date("2026-11-25T09:00:00"),
        blogImage: "",
      },
      {
        title: "Exploring Artificial Intelligence and Machine Learning",
        description:
          "The AI and Machine Learning Seminar explores how intelligent systems learn from data and support decision-making. Students will gain an introduction to machine learning algorithms, practical applications of AI, and the growing role of intelligent technologies in education, healthcare, and industry.",
        eventDate: new Date("2026-11-28T13:00:00"),
        blogImage: "",
      },
      {
        title: "Annual Sports Meet 2026",
        description:
          "The annual Sports Meet celebrates teamwork, discipline, sportsmanship, and healthy competition. Students participate in football, basketball, volleyball, athletics, and other sporting activities, creating opportunities to build friendships and represent their departments with pride.",
        eventDate: new Date("2026-11-30T08:00:00"),
        blogImage: "",
      },
    ];

    const createdBlogs = await Blog.insertMany(blogs);

    console.log(`Successfully created ${createdBlogs.length} blogs`);

    createdBlogs.forEach((blog) => {
      console.log(`- ${blog.title}`);
    });
  } catch (error) {
    console.error("Error seeding blogs:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedBlogs();
