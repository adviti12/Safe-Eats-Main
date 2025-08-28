// src/pages/ProfilePage.tsx
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User as UserIcon, Mail, Bookmark, Save } from "lucide-react";
import { searchAllergens } from "@/services/api"; // <-- make sure this exists

const commonAllergens = [
  { id: "wheat", label: "Wheat" },
  { id: "milk", label: "Milk" },
  { id: "eggs", label: "Eggs" },
  { id: "soy", label: "Soy" },
  { id: "nuts", label: "Nuts" },
  { id: "fish", label: "Fish" },
  { id: "shellfish", label: "Shellfish" },
  { id: "sesame", label: "Sesame" },
];

const slugify = (s: string) => s.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_]/g, "").toLowerCase();

const ProfilePage = () => {
  const { currentUser, updateUser } = useAuth();
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>(
    currentUser?.allergies || []
  );
  const [loading, setLoading] = useState(false);

  // search state
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<
    { source: string; id: any; label: string }[]
  >([]);

  // Keep selectedAllergies in sync when currentUser loads/changes
  useEffect(() => {
    setSelectedAllergies(currentUser?.allergies || []);
  }, [currentUser]);

  // debounce helper
  function debounce<T extends (...args: any[]) => void>(fn: T, ms = 300) {
    let t: any;
    return (...args: Parameters<T>) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  const doSearch = async (q: string) => {
    if (!q || q.trim().length < 1) {
      setSuggestions([]);
      return;
    }
    try {
      const results = await searchAllergens(q, 30);
      setSuggestions(results || []);
    } catch (err) {
      console.error("searchAllergens error", err);
      setSuggestions([]);
    }
  };
  const debouncedSearch = debounce(doSearch, 300);

  const handleToggleAllergy = (allergyLabel: string) => {
    setSelectedAllergies((prev) => {
      if (prev.includes(allergyLabel)) {
        return prev.filter((id) => id !== allergyLabel);
      } else {
        return [...prev, allergyLabel];
      }
    });
  };

  const handleAddSuggestion = (label: string) => {
    if (!label) return;
    setSelectedAllergies((prev) => {
      if (prev.includes(label)) return prev;
      return [...prev, label];
    });
    setQuery("");
    setSuggestions([]);
  };

  const handleSave = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      // normalize: trim, dedupe, remove empty
      const normalized = Array.from(
        new Set(selectedAllergies.map((s) => (s || "").trim()))
      ).filter(Boolean);

      await updateUser({ allergies: normalized });
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Save allergies error", error);
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) return null;

  // Build full list to display: common first, then any selected custom ones
  const commonLabels = commonAllergens.map((c) => c.label);
  const dynamicFromSelected = selectedAllergies.filter(
    (l) => !commonLabels.includes(l)
  );

  const displayAllergens = [
    ...commonAllergens,
    ...dynamicFromSelected.map((label) => ({ id: label, label })),
  ];

  return (
    <div className="container mx-auto px-6 py-6 relative">
      {/* Background decorative elements */}
      <div className="absolute top-20 right-10 w-64 h-64 bg-purple-300/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
      <div className="absolute bottom-20 left-10 w-64 h-64 bg-pink-300/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>

      <h1 className="text-2xl font-bold mb-6 text-gradient relative z-10">Your Profile</h1>

      <div className="grid md:grid-cols-3 gap-6 relative z-10">
        <div className="col-span-1">
          <Card className="border-none shadow-lg rounded-xl overflow-hidden h-full bg-white/80 backdrop-blur-sm">
            <div className="h-24 bg-gradient-to-r from-primary to-violet-400"></div>
            <div className="relative px-6">
              <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center border-4 border-white absolute -top-10 shadow-md">
                <UserIcon className="w-10 h-10 text-primary" />
              </div>
              <CardContent className="pt-14 pb-6 px-0">
                <h2 className="text-xl font-bold">{currentUser.name}</h2>
                <div className="flex items-center gap-2 text-gray-500 mt-1">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm">{currentUser.email}</span>
                </div>
              </CardContent>
            </div>
          </Card>
        </div>

        <div className="col-span-2">
          <Card className="border-none shadow-lg rounded-xl overflow-hidden bg-white/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-lavender-50 to-blue-50 border-b border-gray-200">
              <CardTitle className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-primary" />
                Allergen Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="space-y-5">
                <p className="text-gray-600 bg-blue-50 p-4 rounded-lg border border-blue-100">
                  Select all allergens that apply to you. This information will be used to check
                  food ingredients for potential allergens.
                </p>

                {/* --- SEARCH BOX & SUGGESTIONS (non-invasive) --- */}
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700">Search Allergens</label>
                  <input
                    value={query}
                    onChange={(e) => {
                      const v = e.target.value;
                      setQuery(v);
                      debouncedSearch(v);
                    }}
                    placeholder="Search by name, food, dye, etc."
                    className="w-full mt-2 p-2 border rounded-md"
                  />
                  {suggestions.length > 0 && (
                    <div className="mt-2 bg-white border rounded-md max-h-48 overflow-auto z-50">
                      {suggestions.map((s) => (
                        <div
                          key={`${s.source}_${s.id}`}
                          className="p-2 hover:bg-gray-100 flex justify-between items-center cursor-pointer"
                        >
                          <div
                            onClick={() => handleAddSuggestion(s.label)}
                            className="flex-1"
                          >
                            <div className="font-medium">{s.label}</div>
                            <div className="text-xs text-gray-500">{s.source}</div>
                          </div>
                          <div
                            className="text-sm text-primary ml-3"
                            onClick={() => handleAddSuggestion(s.label)}
                          >
                            Add
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* --- END SEARCH --- */}

                {/* Display grid of allergens (includes dynamic ones added by user) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                  {displayAllergens.map((allergen) => {
                    const label = allergen.label;
                    const slug = slugify(label);
                    const checked = selectedAllergies.includes(label);

                    return (
                      <div
                        key={label}
                        className={`flex items-center space-x-3 p-3 rounded-lg border transition-all ${
                          checked ? "border-primary/30 bg-primary/5" : "border-gray-200"
                        }`}
                      >
                        <Checkbox
                          id={`allergy-${slug}`}
                          checked={checked}
                          onCheckedChange={() => handleToggleAllergy(label)}
                          className={`${checked ? "text-primary border-primary" : ""}`}
                        />
                        <Label
                          htmlFor={`allergy-${slug}`}
                          className="flex-1 cursor-pointer font-medium text-gray-700"
                        >
                          {label}
                        </Label>
                      </div>
                    );
                  })}
                </div>

                <Button
                  onClick={handleSave}
                  className="w-full mt-4 bg-primary hover:bg-primary/90 text-white rounded-lg py-2.5 shadow-md"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Saving...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <Save className="w-5 h-5 mr-2" />
                      Save Allergies
                    </div>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
