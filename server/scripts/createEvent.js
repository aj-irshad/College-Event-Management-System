import dotenv from "dotenv";
import mongoose from "mongoose";
import Event from "../model/events.js";

dotenv.config({ path: "../.env" });

const seedEvents = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected");

    const events = [
      {
        title: "Tech Fest 2026",
        description:
          "A technical festival featuring coding competitions, workshops, and technology exhibitions.",
        event_type: "Technical",
        start_at: new Date("2026-08-20T10:00:00"),
        end_at: new Date("2026-08-20T16:00:00"),
        venue: "Main Auditorium",
        status: "Upcoming",
      },
      {
        title: "Web Development Workshop",
        description:
          "Hands-on workshop covering modern web development using React and Node.js.",
        event_type: "Workshop",
        start_at: new Date("2026-08-22T11:00:00"),
        end_at: new Date("2026-08-22T14:00:00"),
        venue: "Computer Lab 1",
        status: "Upcoming",
      },
      {
        title: "Inter College Hackathon",
        description:
          "A competitive hackathon where students build innovative solutions to real-world problems.",
        event_type: "Competition",
        start_at: new Date("2026-08-25T09:00:00"),
        end_at: new Date("2026-08-25T18:00:00"),
        venue: "Innovation Center",
        status: "Upcoming",
      },
      {
        title: "AI and Machine Learning Seminar",
        description:
          "An introductory seminar discussing artificial intelligence, machine learning, and their applications.",
        event_type: "Seminar",
        start_at: new Date("2026-08-28T13:00:00"),
        end_at: new Date("2026-08-28T16:00:00"),
        venue: "Seminar Hall",
        status: "Upcoming",
      },
      {
        title: "Sports Meet 2026",
        description:
          "Annual college sports meet featuring football, basketball, volleyball, and athletics.",
        event_type: "Sports",
        start_at: new Date("2026-08-30T08:00:00"),
        end_at: new Date("2026-08-30T17:00:00"),
        venue: "College Ground",
        status: "Upcoming",
      },
    ];

    const createdEvents = await Event.insertMany(events);

    console.log(`${createdEvents.length} events created successfully`);

    await mongoose.connection.close();
  } catch (error) {
    console.error("Error seeding events:", error);
    process.exit(1);
  }
};

seedEvents();
