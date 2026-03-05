"use client";
import { PLACEHOLDER_USERS } from "@/utils/placeholder";
import { Course, User } from "@/utils/types";
import { PLACEHOLDER_COURSES } from "@/utils/placeholder";
import Link from "next/link";

function renderCourseButtons() {
  const user: User = PLACEHOLDER_USERS[1];
  const validcourses: Course[] = [];
  for (let i = 0; i < PLACEHOLDER_COURSES.length; i++) {
    if (user.courseids != null && user.courseids.includes(PLACEHOLDER_COURSES[i].id)) {
      validcourses.push(PLACEHOLDER_COURSES[i]);
    }
  }
  if (validcourses.length > 0) {
    return (
      <div
        className="p-4 py-10 w-full backdrop-blur-[1.5px]
             border-4 rounded-2xl border-blue-50 bg-yellow-050"
      >
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto text-center">
          {validcourses.map((course, index) => (
            <Link
              key={index}
              href="/room"
              className="flex flex-col items-center justify-center
             py-6 px-4 transition duration-300 text-center rounded-2xl
             bg-white-020 shadow-xl backdrop-blur-[1.5px] border-4 border-blue-50
              h-[15rem] group
             "
            >
              <div className="transition duration-300 group">
                <h3 className="font-bold text-3xl ">
                  <span className="group-hover:bg-blue-400 duration-300 ">{course.name}</span>
                </h3>
                <h3>
                  <span className="group-hover:bg-blue-400 duration-300 ">{course.professor}</span>
                </h3>
                <h3 className="px-4">
                  <span className="group-hover:bg-blue-400 duration-300 ">
                    {"Begins: " + course.beginDate}
                  </span>
                </h3>
                <h3 className="px-4">
                  <span className="group-hover:bg-blue-400 duration-300 ">
                    {"Ends: " + course.endDate}
                  </span>
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  } else {
    return (
      <div
        className="p-4 py-10 w-full backdrop-blur-[1.5px]
    border-4 rounded-2xl border-blue-50 bg-yellow-050 
    flex items-center justify-center h-120"
      >
        <h1 className="text-center text-2xl">No Classes Available Currently </h1>
      </div>
    );
  }
}

export default function LandingPage() {
  return (
    <div className="  max-h-screen overlow-y-auto flex flex-col dot-grid relative">
      <h1
        className="absolute items-center justify-between shadow-md top-6
     left-7 right-7 z-[5] bg-white rounded-lg 
     text-2xl font-bold text-left py-2 px-3 flex 
     border-3 border-blue-50"
      >
        <span className="text-lg font-bold px-2">AskEasy</span>

        <div className="space-x-3">
          <button className="px-2 rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100 transition">
            Create a Class
          </button>
        </div>
      </h1>
      <div className="overflow-y-auto">
        <div className="flex-1 p-5 pt-32 items-center justify-center pb-10">
          <h1 className="text-4xl py-4 text-center">Classrooms</h1>
          {renderCourseButtons()}
        </div>

        <footer className="text-white bg-black mt-6 flex-shrink-0">
          <div className="max-w-6xl mx-auto px-6 py-8 w-full">
            <div className="grid grid-cols-1 mx-auto md:grid-cols-2 gap-8 md:gap-12 w-full">
              <div className="flex flex-col mx-auto items-center md:items-start space-y-4">
                <h2 className="text-lg font-semibold tracking-wide uppercase">Contact Us</h2>
                <a
                  href="mailto:[EMAIL_ADDRESS]"
                  className="transition-colors duration-200 flex items-center gap-2"
                >
                  <svg
                    className="w-5 h-5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    ></path>
                  </svg>
                  [EMAIL_ADDRESS]
                </a>
              </div>

              <div className="flex flex-col mx-auto items-center md:items-start space-y-4">
                <h2 className="text-lg font-semibold  tracking-wide uppercase">Support</h2>
                <div className="flex flex-wrap justify-center md:justify-start gap-4 md:gap-6">
                  <a href="#" className=" transition-colors duration-200">
                    For Professors
                  </a>
                  <span className="text-stone-400 hidden md:inline">•</span>
                  <a href="#" className=" transition-colors duration-200">
                    For Students
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-5 px-10 pt-5 border-t border-whiteflex flex-col md:flex-row items-center justify-between text-sm  w-full ">
              <p>© {new Date().getFullYear()} AskEasy. All rights reserved.</p>
              <div className="flex flex-wrap justify-center space-x-4"></div>
            </div>
          </div>{" "}
        </footer>
      </div>
    </div>
  );
}
