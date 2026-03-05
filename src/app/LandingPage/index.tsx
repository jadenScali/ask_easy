"use client";
import { Course, User, Role } from "@/utils/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import renderCourseButtons from "./CourseViewer";

//sample user
const placeholder_user: User = {
  username: "Hi",
  pfp: "H",
  role: "student",
};

export function renderAvatar(user: User) {
  return (
    <Avatar className="h-8 w-8">
      <AvatarImage src={user.pfp} alt={user.username} />
      <AvatarFallback className="bg-stone-50 font-medium text-xl">
        {user.username[0]}
      </AvatarFallback>
    </Avatar>
  );
}

export default function LandingPage() {
  return (
    <div className="  max-h-screen overlow-y-auto flex flex-col dot-grid relative">
      <div
        className="absolute items-center justify-between shadow-md top-6
     left-7 right-7 z-[5] bg-white rounded-lg 
     text-2xl font-bold text-left py-2 px-3 flex 
     border-3 border-blue-50"
      >
        <span className="text-lg font-bold px-2">AskEasy</span>

        {renderAvatar(placeholder_user)}
      </div>
      <div className="overflow-y-auto">
        <div className="flex-1 p-5 pt-32 items-center justify-center pb-10">
          <h1 className="text-4xl font-bold py-4 text-center">Classrooms</h1>
          {renderCourseButtons()}
        </div>

        <footer className="w-full bg-stone-50 text-stone-800 rounded-t-lg z-10 relative">
          <div className="max-w-6xl mx-auto px-6 py-12 w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 w-full">
              <div className="flex flex-col items-center md:items-start space-y-4">
                <h2 className="text-lg font-semibold text-stone-900 tracking-wide uppercase">
                  Contact Us
                </h2>
                <a
                  href="mailto:[EMAIL_ADDRESS]"
                  className="hover:text-stone-900 transition-colors duration-200 flex items-center gap-2"
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

              <div className="flex flex-col items-center md:items-start space-y-4">
                <h2 className="text-lg font-semibold text-stone-900 tracking-wide uppercase">
                  Support
                </h2>
                <div className="flex flex-wrap justify-center md:justify-start gap-4 md:gap-6">
                  <a href="#" className="hover:text-stone-900 transition-colors duration-200">
                    For Professors
                  </a>
                  <span className="text-stone-800 hidden md:inline">•</span>
                  <a href="#" className="hover:text-stone-900 transition-colors duration-200">
                    For Students
                  </a>
                </div>
              </div>
            </div>

            <div
              className="mt-12 pt-8 border-t border-stone-300/50 
            flex flex-col md:flex-row items-center justify-between text-sm 
            text-stone-800 w-full gap-4"
            >
              <p>© {new Date().getFullYear()} AskEasy. All rights reserved.</p>
              <div className="flex flex-wrap justify-center space-x-4"></div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
