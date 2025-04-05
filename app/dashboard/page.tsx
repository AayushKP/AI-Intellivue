"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, UploadCloud } from "lucide-react";
import { useState, useRef, ChangeEvent } from "react";
import { toast } from "sonner";

export default function Interview() {
  const [selectedTech, setSelectedTech] = useState<string[]>([]);
  const [techInput, setTechInput] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTechSelect = () => {
    if (techInput.trim() && !selectedTech.includes(techInput.trim())) {
      setSelectedTech([...selectedTech, techInput.trim()]);
      setTechInput("");
    }
  };

  const removeTech = (techToRemove: string) => {
    setSelectedTech(selectedTech.filter((tech) => tech !== techToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && techInput.trim()) {
      handleTechSelect();
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      if (file.type !== "application/pdf") {
        toast.error("Please upload a PDF file only.");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error("Maximum file size is 5MB.");
        return;
      }

      setResumeFile(file);
      setFileName(file.name);
      toast.success("Resume uploaded successfully");
    }
  };

  return (
    <div className="h-[100dvh] p-10 w-full bg-gray-900 text-black flex justify-center items-center">
      <div className="bg-black rounded-md h-full w-full grid grid-cols-3 overflow-hidden border border-gray-700">
        <div className="bg-black h-full col-span-2 p-8 flex flex-col justify-center items-center">
          <div className="text-white font-sans text-4xl text-center">
            Create Customisable Interview Sessions
          </div>
          <div className="text-white font-sans text-lg text-center mt-1">
            Generate customizable, concise, and relevant interview questions
          </div>
          <div className="mt-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="text-lg rounded-full px-10 py-5 cursor-pointer"
                >
                  Practice
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[700px] bg-gray-900 text-white">
                <DialogHeader>
                  <DialogTitle className="text-2xl">
                    Interview Setup
                  </DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Customize your practice interview
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                  <div className="flex gap-4">
                    <div className="space-y-2 w-1/2">
                      <Label htmlFor="role" className="text-white">
                        Role
                      </Label>
                      <Select>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Role" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 text-white">
                          <SelectGroup>
                            <SelectItem value="frontend">
                              Frontend Developer
                            </SelectItem>
                            <SelectItem value="backend">
                              Backend Developer
                            </SelectItem>
                            <SelectItem value="fullstack">
                              Full Stack Developer
                            </SelectItem>
                            <SelectItem value="devops">
                              DevOps Engineer
                            </SelectItem>
                            <SelectItem value="mobile">
                              Mobile Developer
                            </SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 w-1/2">
                      <Label htmlFor="level" className="text-white">
                        Level
                      </Label>
                      <Select>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Level" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 text-white">
                          <SelectGroup>
                            <SelectItem value="junior">Junior</SelectItem>
                            <SelectItem value="mid">Mid-level</SelectItem>
                            <SelectItem value="senior">Senior</SelectItem>
                            <SelectItem value="lead">Lead</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="experience" className="text-white">
                      Experience (years)
                    </Label>
                    <Input
                      id="experience"
                      type="number"
                      placeholder="Enter years of experience"
                      className="bg-gray-800 text-white border-gray-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="technologies" className="text-white">
                      Technologies
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="technologies"
                        placeholder="Enter technology and press Enter"
                        className="bg-gray-800 text-white border-gray-700 flex-1"
                        value={techInput}
                        onChange={(e) => setTechInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                      />
                      <Button
                        type="button"
                        onClick={handleTechSelect}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Add
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedTech.map((tech) => (
                        <Badge
                          key={tech}
                          variant="outline"
                          className="px-3 py-1 text-sm bg-gray-800 text-white border-gray-700"
                        >
                          {tech}
                          <button
                            type="button"
                            onClick={() => removeTech(tech)}
                            className="ml-2 rounded-full hover:bg-gray-700 p-1"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="resume" className="text-white">
                      Upload Resume
                    </Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        variant="outline"
                        className="bg-gray-800 text-white border-gray-700 hover:bg-gray-700"
                      >
                        <UploadCloud className="h-4 w-4 mr-2" />
                        Choose File
                      </Button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".pdf"
                        className="hidden"
                        id="resume-upload"
                      />
                      {fileName ? (
                        <span className="text-sm text-gray-300 truncate max-w-xs">
                          {fileName}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">
                          No file chosen
                        </span>
                      )}
                      {fileName && (
                        <button
                          type="button"
                          onClick={() => {
                            setResumeFile(null);
                            setFileName("");
                          }}
                          className="text-gray-400 hover:text-white ml-2"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      PDF files only (max. 5MB)
                    </p>
                  </div>
                </div>

                <div className="flex justify-center mt-4">
                  <Button className="px-10 py-5 text-lg bg-blue-600 hover:bg-blue-700">
                    Generate Interview Questions
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="bg-black h-full border-l border-gray-700 flex items-center justify-center">
          <div className="text-gray-500 text-center p-4">
            Interview preview will appear here
          </div>
        </div>
      </div>
    </div>
  );
}
