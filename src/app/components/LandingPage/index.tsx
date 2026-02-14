"use client";

import { PLACEHOLDER_USERS } from "@/utils/placeholder";
import { Course, User } from "@/utils/types";
import { PLACEHOLDER_COURSES } from "@/utils/placeholder";

function renderCourseButtons() {
  const user: User = PLACEHOLDER_USERS[1];
  const validcourses: Course[] = [];
  for (let i = 0; i < PLACEHOLDER_COURSES.length; i++) {
    if (user.courseids != null && user.courseids.includes(PLACEHOLDER_COURSES[i].id)) {
      validcourses.push(PLACEHOLDER_COURSES[i]);
    }
  }
  return (
    <div className="flex-1 bg-blue-500 p-4 min-h-screen w-full ">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {validcourses.map((course, index) => (
          <div
            key={index}
            className="flex flex-col 
                   bg-stone-50 
                   rounded-xl 
                   p-4 "
          >
            <div className="font-bold text-xl">{course.name}</div>
            <div>{course.professor}</div>
            <div>{"Begins: " + course.beginDate}</div>
            <div>{"Ends: " + course.endDate}</div>
            <div>{"id:" + course.id}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="flex flex-col bg-background sticky c top-0 z-10">
      <header className="pl-2 pr-4 py-2 flex items-center justify-between border-b-1 border-stone-300 ">
        <div className="flex items-center justify-left gap-2 ">
          <h1 className="text-xl font-bold">Ask Easy</h1>
        </div>
      </header>
      <div className="flex justify-center py-6">
        <h1 className="text-3xl font-medium text-gray-700 mt-4">Classrooms</h1>
      </div>
      <div className="justify-center items-center min-h-screen w-full bg-blue">
        {renderCourseButtons()}
      </div>
    </div>
  );
}
