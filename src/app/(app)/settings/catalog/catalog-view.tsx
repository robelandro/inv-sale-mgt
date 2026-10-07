"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
  createUnitAction,
  updateUnitAction,
  deleteUnitAction,
} from "@/app/actions/catalog.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Edit, Loader2 } from "lucide-react";

export function CatalogView({
  categories,
  units,
}: {
  categories: any[];
  units: any[];
}) {
  const router = useRouter();

  // Category state
  const [catName, setCatName] = React.useState("");
  const [isAddingCat, setIsAddingCat] = React.useState(false);
  const [editCat, setEditCat] = React.useState<any>(null);
  const [editCatName, setEditCatName] = React.useState("");
  const [isEditingCat, setIsEditingCat] = React.useState(false);

  // Unit state
  const [unitName, setUnitName] = React.useState("");
  const [unitShortName, setUnitShortName] = React.useState("");
  const [isAddingUnit, setIsAddingUnit] = React.useState(false);
  const [editUnit, setEditUnit] = React.useState<any>(null);
  const [editUnitName, setEditUnitName] = React.useState("");
  const [editUnitShort, setEditUnitShort] = React.useState("");
  const [isEditingUnit, setIsEditingUnit] = React.useState(false);

  // Category Handlers
  const handleAddCat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    setIsAddingCat(true);
    try {
      const res = await createCategoryAction(catName.trim());
      if (!res.success) {
        toast.error(res.error || "Failed to create category");
        return;
      }
      toast.success("Category created");
      setCatName("");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsAddingCat(false);
    }
  };

  const handleUpdateCat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCatName.trim() || !editCat) return;

    setIsEditingCat(true);
    try {
      const res = await updateCategoryAction(editCat.id, editCatName.trim());
      if (!res.success) {
        toast.error(res.error || "Update failed");
        return;
      }
      toast.success("Category updated");
      setEditCat(null);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsEditingCat(false);
    }
  };

  const handleDeleteCat = async (id: string, name: string) => {
    if (!confirm(`Delete category "${name}"?`)) return;
    try {
      const res = await deleteCategoryAction(id);
      if (!res.success) {
        toast.error(res.error || "Cannot delete category in use");
        return;
      }
      toast.success("Category deleted");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Unit Handlers
  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitName.trim() || !unitShortName.trim()) return;

    setIsAddingUnit(true);
    try {
      const res = await createUnitAction(unitName.trim(), unitShortName.trim());
      if (!res.success) {
        toast.error(res.error || "Failed to create unit");
        return;
      }
      toast.success("Unit created");
      setUnitName("");
      setUnitShortName("");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsAddingUnit(false);
    }
  };

  const handleUpdateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUnitName.trim() || !editUnitShort.trim() || !editUnit) return;

    setIsEditingUnit(true);
    try {
      const res = await updateUnitAction(
        editUnit.id,
        editUnitName.trim(),
        editUnitShort.trim()
      );
      if (!res.success) {
        toast.error(res.error || "Update failed");
        return;
      }
      toast.success("Unit updated");
      setEditUnit(null);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsEditingUnit(false);
    }
  };

  const handleDeleteUnit = async (id: string, name: string) => {
    if (!confirm(`Delete unit "${name}"?`)) return;
    try {
      const res = await deleteUnitAction(id);
      if (!res.success) {
        toast.error(res.error || "Cannot delete unit in use");
        return;
      }
      toast.success("Unit deleted");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Catalog Setup</h1>
        <p className="text-sm text-muted-foreground">
          Configure product categories and standard units of measurement
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Categories Card */}
        <Card className="rounded-card border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Categories</CardTitle>
            <CardDescription className="text-xs">
              Group inventory items for filtered searching and reporting
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleAddCat} className="flex gap-2">
              <Input
                placeholder="New category name..."
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                className="h-9 text-sm"
              />
              <Button type="submit" size="sm" disabled={isAddingCat || !catName.trim()}>
                {isAddingCat && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
                Add
              </Button>
            </form>

            <div className="border rounded-xl divide-y max-h-80 overflow-y-auto">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="p-3 flex items-center justify-between text-sm hover:bg-muted/20"
                >
                  <span className="font-medium text-foreground">{c.name}</span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditCat(c);
                        setEditCatName(c.name);
                      }}
                      className="h-7 w-7 p-0"
                    >
                      <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCat(c.id, c.name)}
                      className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Units Card */}
        <Card className="rounded-card border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Units of Measure</CardTitle>
            <CardDescription className="text-xs">
              Quantities and short labels (e.g. Pieces / pcs, Kilogram / kg)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleAddUnit} className="flex gap-2">
              <Input
                placeholder="Name (e.g. Box)"
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                className="h-9 text-sm flex-1"
              />
              <Input
                placeholder="Code (box)"
                value={unitShortName}
                onChange={(e) => setUnitShortName(e.target.value)}
                className="h-9 text-sm w-24"
              />
              <Button
                type="submit"
                size="sm"
                disabled={isAddingUnit || !unitName.trim() || !unitShortName.trim()}
              >
                {isAddingUnit && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
                Add
              </Button>
            </form>

            <div className="border rounded-xl divide-y max-h-80 overflow-y-auto">
              {units.map((u) => (
                <div
                  key={u.id}
                  className="p-3 flex items-center justify-between text-sm hover:bg-muted/20"
                >
                  <div>
                    <span className="font-medium text-foreground">{u.name}</span>
                    <span className="text-xs text-muted-foreground ml-2 font-mono">
                      ({u.shortName})
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditUnit(u);
                        setEditUnitName(u.name);
                        setEditUnitShort(u.shortName);
                      }}
                      className="h-7 w-7 p-0"
                    >
                      <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteUnit(u.id, u.name)}
                      className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Category Dialog */}
      <Dialog open={!!editCat} onOpenChange={() => setEditCat(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateCat} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Category Name</Label>
              <Input
                value={editCatName}
                onChange={(e) => setEditCatName(e.target.value)}
                autoFocus
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditCat(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isEditingCat}>
                {isEditingCat && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Unit Dialog */}
      <Dialog open={!!editUnit} onOpenChange={() => setEditUnit(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Unit</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateUnit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Unit Name</Label>
              <Input
                value={editUnitName}
                onChange={(e) => setEditUnitName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Short Code</Label>
              <Input
                value={editUnitShort}
                onChange={(e) => setEditUnitShort(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditUnit(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isEditingUnit}>
                {isEditingUnit && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
