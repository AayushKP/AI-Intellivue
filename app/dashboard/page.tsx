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
import { X, UploadCloud, Loader2 } from "lucide-react";
import { useState, useRef, ChangeEvent } from "react";
import { toast } from "sonner";
import pdfToText from "react-pdftotext";

export default function Interview() {
  const [role, setRole] = useState<string>("");
  const [level, setLevel] = useState<string>("");
  const [experience, setExperience] = useState<string>("");
  const [selectedTech, setSelectedTech] = useState<string[]>([]);
  const [techInput, setTechInput] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [resumeText, setResumeText] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
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
      e.preventDefault();
      handleTechSelect();
    }
  };

  const clearResume = () => {
    setResumeFile(null);
    setFileName("");
    setResumeText(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      if (file.type !== "application/pdf") {
        toast.error("Please upload a PDF file only.");
        clearResume();
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Maximum file size is 5MB.");
        clearResume();
        return;
      }

      setResumeFile(file);
      setFileName(file.name);
      setResumeText(null);
      setIsParsing(true);
      toast.info("Parsing resume...");

      try {
        const text = await pdfToText(file);
        console.log(text);
        setResumeText(text.trim());
        toast.success("Resume parsed successfully");
      } catch (error) {
        console.error("Failed to extract text from pdf:", error);
        toast.error("Failed to parse PDF. Ensure it's a valid PDF file.");
        clearResume();
      } finally {
        setIsParsing(false);
      }
    } else {
      clearResume();
    }
  };

  const handleSubmit = async () => {
    if (!role) {
      toast.error("Please select a Role.");
      return;
    }
    if (!level) {
      toast.error("Please select a Level.");
      return;
    }
    if (
      !experience ||
      isNaN(parseInt(experience)) ||
      parseInt(experience) < 0
    ) {
      toast.error("Please enter valid years of Experience (0 or more).");
      return;
    }
    if (!resumeText && resumeFile) {
      toast.warning(
        "Resume parsing is still in progress or failed. Please wait or re-upload."
      );
      return;
    }
    if (!resumeText && !resumeFile) {
      toast.error("Please upload and parse a resume.");
      return;
    }

    setIsSubmitting(true);
    toast.info("Generating interview questions...");

    const payload = {
      role,
      level,
      experience: parseInt(experience, 10),
      technologies: selectedTech,
      resumeData: resumeText,
    };
    console.log(payload);

    try {
      const response = await fetch("/api/generate-interview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMsg = "Failed to generate questions.";
        try {
          const errorData = await response.json();
          errorMsg = errorData.message || errorMsg;
        } catch (jsonError) {
          errorMsg = `${errorMsg} (Status: ${response.status})`;
        }
        throw new Error(errorMsg);
      }

      const result = await response.json();
      console.log("Backend Response:", result);
      toast.success("Interview questions generated successfully!");
    } catch (error: any) {
      console.error("Submission Error:", error);
      toast.error(
        `Submission failed: ${error.message || "An unknown error occurred."}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-[100dvh] p-10 w-full bg-gray-900 text-black flex justify-center items-center">
      <div className="bg-black rounded-md h-full w-full grid grid-cols-3 overflow-hidden border border-gray-700">
        {/* Left Panel */}
        <div className="bg-black h-full col-span-2 p-8 flex flex-col justify-center items-center">
          {/* ... Title and Description ... */}
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
                      <Select value={role} onValueChange={setRole}>
                        <SelectTrigger
                          id="role"
                          className="w-full bg-gray-800 border-gray-700"
                        >
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
                      <Select value={level} onValueChange={setLevel}>
                        <SelectTrigger
                          id="level"
                          className="w-full bg-gray-800 border-gray-700"
                        >
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
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                      min="0"
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
                        disabled={isParsing || isSubmitting}
                      />
                      <Button
                        type="button"
                        onClick={handleTechSelect}
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={isParsing || isSubmitting}
                      >
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2 min-h-[24px]">
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
                            className="ml-2 rounded-full hover:bg-gray-700 p-0.5 disabled:opacity-50"
                            disabled={isParsing || isSubmitting}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Resume Upload */}
                  <div className="space-y-2">
                    <Label htmlFor="resume-upload" className="text-white">
                      Upload Resume
                    </Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        variant="outline"
                        className="bg-gray-800 text-white border-gray-700 hover:bg-gray-700"
                        disabled={isParsing || isSubmitting}
                      >
                        {isParsing ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <UploadCloud className="h-4 w-4 mr-2" />
                        )}
                        Choose File
                      </Button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".pdf"
                        className="hidden"
                        id="resume-upload"
                        disabled={isParsing || isSubmitting}
                      />
                      {/* Display File Name or Status */}
                      <span className="text-sm text-gray-300 truncate max-w-xs flex items-center">
                        {isParsing && !fileName && "Parsing..."}
                        {fileName && !isParsing && fileName}
                        {!fileName && !isParsing && (
                          <span className="text-gray-500">No file chosen</span>
                        )}
                      </span>
                      {/* Clear Button */}
                      {(fileName || isParsing) && !isSubmitting && (
                        <button
                          type="button"
                          onClick={clearResume}
                          className="text-gray-400 hover:text-white ml-auto p-1 disabled:opacity-50"
                          disabled={isParsing}
                          title="Remove file"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      PDF files only (max. 5MB)
                      {resumeText
                        ? ` (${(resumeText.length / 1024).toFixed(
                            1
                          )} KB parsed)`
                        : ""}
                    </p>
                  </div>
                </div>

                <div className="flex justify-center mt-4">
                  <Button
                    className="px-10 py-5 text-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-70"
                    onClick={handleSubmit}
                    disabled={isParsing || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      "Generate Interview Questions"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="bg-black h-full border-l border-gray-700 flex items-center justify-center p-4">
          <div className="text-gray-500 text-center">
            Interview preview will appear here
          </div>
        </div>
      </div>
    </div>
  );
}
