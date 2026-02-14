"use client";

import { useEffect, useState } from "react";
import { getCategories, createCategory, deleteCategory } from "@/lib/skating-store/content-actions";
import { Category } from "@/types/skating-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Trash2, Plus, Package, Component as ComponentIcon, Footprints, Shield, Disc, Shirt, Image as ImageIcon, Search,
  Wrench, Star, Heart, Zap, Tag, ShoppingBag, ShoppingCart, Gift, Award, Crown, Gem, Flame,
  Bike, Car, Truck, Plane, Rocket, Anchor, Compass, Map, MapPin, Globe,
  Headphones, Music, Camera, Film, Tv, Monitor, Smartphone, Tablet, Watch, Gamepad2,
  Dumbbell, Trophy, Target, Flag, Timer, Gauge, Swords, CircleDot,
  Sun, Moon, Cloud, Snowflake, Droplets, Wind, Thermometer, Umbrella,
  Scissors, Paintbrush, Palette, PenTool, Ruler, Hammer, Cog,
  BookOpen, GraduationCap, Lightbulb, Brain, Eye, Glasses,
  Apple, Coffee, UtensilsCrossed, Wine, IceCreamCone, Candy, Leaf, TreePine, Flower2,
  Dog, Cat, Bug, Fish, Bird,
  Baby, Users, UserCircle, Smile, HandMetal, Sparkles, PartyPopper,
  Lock, Key, ShieldCheck, AlertTriangle, Ban, CheckCircle, XCircle,
  Wifi, Bluetooth, Battery, Plug, Cable, Cpu, HardDrive, Database,
  Wallet, CreditCard, Banknote, PiggyBank, Receipt, BarChart3, TrendingUp,
  Home, Building2, Store, Warehouse, DoorOpen, Bed, Sofa, Lamp,
  Stethoscope, Pill, Syringe, Microscope, Dna, HeartPulse,
  Briefcase, FileText, Folder, Inbox, Send, Mail, Phone, MessageCircle,
  Calendar, Clock, AlarmClock, Hourglass, RotateCcw,
  ArrowUpDown, Layers, Grid3X3, LayoutGrid, Box, Boxes, Archive, Bookmark
} from "lucide-react";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: "", slug: "", description: "", icon_name: "", icon_url: "" });
  const [iconSearch, setIconSearch] = useState("");

  const iconMap: Record<string, React.ReactNode> = {
    Package: <Package className="h-5 w-5" />, Component: <ComponentIcon className="h-5 w-5" />, Footprints: <Footprints className="h-5 w-5" />,
    Shield: <Shield className="h-5 w-5" />, Disc: <Disc className="h-5 w-5" />, Shirt: <Shirt className="h-5 w-5" />,
    Wrench: <Wrench className="h-5 w-5" />, Star: <Star className="h-5 w-5" />, Heart: <Heart className="h-5 w-5" />,
    Zap: <Zap className="h-5 w-5" />, Tag: <Tag className="h-5 w-5" />, ShoppingBag: <ShoppingBag className="h-5 w-5" />,
    ShoppingCart: <ShoppingCart className="h-5 w-5" />, Gift: <Gift className="h-5 w-5" />, Award: <Award className="h-5 w-5" />,
    Crown: <Crown className="h-5 w-5" />, Gem: <Gem className="h-5 w-5" />, Flame: <Flame className="h-5 w-5" />,
    Bike: <Bike className="h-5 w-5" />, Car: <Car className="h-5 w-5" />, Truck: <Truck className="h-5 w-5" />,
    Plane: <Plane className="h-5 w-5" />, Rocket: <Rocket className="h-5 w-5" />, Anchor: <Anchor className="h-5 w-5" />,
    Compass: <Compass className="h-5 w-5" />, Map: <Map className="h-5 w-5" />, MapPin: <MapPin className="h-5 w-5" />,
    Globe: <Globe className="h-5 w-5" />, Headphones: <Headphones className="h-5 w-5" />, Music: <Music className="h-5 w-5" />,
    Camera: <Camera className="h-5 w-5" />, Film: <Film className="h-5 w-5" />, Tv: <Tv className="h-5 w-5" />,
    Monitor: <Monitor className="h-5 w-5" />, Smartphone: <Smartphone className="h-5 w-5" />, Tablet: <Tablet className="h-5 w-5" />,
    Watch: <Watch className="h-5 w-5" />, Gamepad2: <Gamepad2 className="h-5 w-5" />, Dumbbell: <Dumbbell className="h-5 w-5" />,
    Trophy: <Trophy className="h-5 w-5" />, Target: <Target className="h-5 w-5" />, Flag: <Flag className="h-5 w-5" />,
    Timer: <Timer className="h-5 w-5" />, Gauge: <Gauge className="h-5 w-5" />, Swords: <Swords className="h-5 w-5" />,
    CircleDot: <CircleDot className="h-5 w-5" />, Sun: <Sun className="h-5 w-5" />, Moon: <Moon className="h-5 w-5" />,
    Cloud: <Cloud className="h-5 w-5" />, Snowflake: <Snowflake className="h-5 w-5" />, Droplets: <Droplets className="h-5 w-5" />,
    Wind: <Wind className="h-5 w-5" />, Thermometer: <Thermometer className="h-5 w-5" />, Umbrella: <Umbrella className="h-5 w-5" />,
    Scissors: <Scissors className="h-5 w-5" />, Paintbrush: <Paintbrush className="h-5 w-5" />, Palette: <Palette className="h-5 w-5" />,
    PenTool: <PenTool className="h-5 w-5" />, Ruler: <Ruler className="h-5 w-5" />, Hammer: <Hammer className="h-5 w-5" />,
    Cog: <Cog className="h-5 w-5" />, BookOpen: <BookOpen className="h-5 w-5" />, GraduationCap: <GraduationCap className="h-5 w-5" />,
    Lightbulb: <Lightbulb className="h-5 w-5" />, Brain: <Brain className="h-5 w-5" />, Eye: <Eye className="h-5 w-5" />,
    Glasses: <Glasses className="h-5 w-5" />, Apple: <Apple className="h-5 w-5" />, Coffee: <Coffee className="h-5 w-5" />,
    UtensilsCrossed: <UtensilsCrossed className="h-5 w-5" />, Wine: <Wine className="h-5 w-5" />, IceCreamCone: <IceCreamCone className="h-5 w-5" />,
    Candy: <Candy className="h-5 w-5" />, Leaf: <Leaf className="h-5 w-5" />, TreePine: <TreePine className="h-5 w-5" />,
    Flower2: <Flower2 className="h-5 w-5" />, Dog: <Dog className="h-5 w-5" />, Cat: <Cat className="h-5 w-5" />,
    Bug: <Bug className="h-5 w-5" />, Fish: <Fish className="h-5 w-5" />, Bird: <Bird className="h-5 w-5" />,
    Baby: <Baby className="h-5 w-5" />, Users: <Users className="h-5 w-5" />, UserCircle: <UserCircle className="h-5 w-5" />,
    Smile: <Smile className="h-5 w-5" />, HandMetal: <HandMetal className="h-5 w-5" />, Sparkles: <Sparkles className="h-5 w-5" />,
    PartyPopper: <PartyPopper className="h-5 w-5" />, Lock: <Lock className="h-5 w-5" />, Key: <Key className="h-5 w-5" />,
    ShieldCheck: <ShieldCheck className="h-5 w-5" />, AlertTriangle: <AlertTriangle className="h-5 w-5" />, Ban: <Ban className="h-5 w-5" />,
    CheckCircle: <CheckCircle className="h-5 w-5" />, XCircle: <XCircle className="h-5 w-5" />, Wifi: <Wifi className="h-5 w-5" />,
    Bluetooth: <Bluetooth className="h-5 w-5" />, Battery: <Battery className="h-5 w-5" />, Plug: <Plug className="h-5 w-5" />,
    Cable: <Cable className="h-5 w-5" />, Cpu: <Cpu className="h-5 w-5" />, HardDrive: <HardDrive className="h-5 w-5" />,
    Database: <Database className="h-5 w-5" />, Wallet: <Wallet className="h-5 w-5" />, CreditCard: <CreditCard className="h-5 w-5" />,
    Banknote: <Banknote className="h-5 w-5" />, PiggyBank: <PiggyBank className="h-5 w-5" />, Receipt: <Receipt className="h-5 w-5" />,
    BarChart3: <BarChart3 className="h-5 w-5" />, TrendingUp: <TrendingUp className="h-5 w-5" />, Home: <Home className="h-5 w-5" />,
    Building2: <Building2 className="h-5 w-5" />, Store: <Store className="h-5 w-5" />, Warehouse: <Warehouse className="h-5 w-5" />,
    DoorOpen: <DoorOpen className="h-5 w-5" />, Bed: <Bed className="h-5 w-5" />, Sofa: <Sofa className="h-5 w-5" />,
    Lamp: <Lamp className="h-5 w-5" />, Stethoscope: <Stethoscope className="h-5 w-5" />, Pill: <Pill className="h-5 w-5" />,
    Syringe: <Syringe className="h-5 w-5" />, Microscope: <Microscope className="h-5 w-5" />, Dna: <Dna className="h-5 w-5" />,
    HeartPulse: <HeartPulse className="h-5 w-5" />, Briefcase: <Briefcase className="h-5 w-5" />, FileText: <FileText className="h-5 w-5" />,
    Folder: <Folder className="h-5 w-5" />, Inbox: <Inbox className="h-5 w-5" />, Send: <Send className="h-5 w-5" />,
    Mail: <Mail className="h-5 w-5" />, Phone: <Phone className="h-5 w-5" />, MessageCircle: <MessageCircle className="h-5 w-5" />,
    Calendar: <Calendar className="h-5 w-5" />, Clock: <Clock className="h-5 w-5" />, AlarmClock: <AlarmClock className="h-5 w-5" />,
    Hourglass: <Hourglass className="h-5 w-5" />, RotateCcw: <RotateCcw className="h-5 w-5" />, ArrowUpDown: <ArrowUpDown className="h-5 w-5" />,
    Layers: <Layers className="h-5 w-5" />, Grid3X3: <Grid3X3 className="h-5 w-5" />, LayoutGrid: <LayoutGrid className="h-5 w-5" />,
    Box: <Box className="h-5 w-5" />, Boxes: <Boxes className="h-5 w-5" />, Archive: <Archive className="h-5 w-5" />,
    Bookmark: <Bookmark className="h-5 w-5" />,
  };

  const iconKeys = Object.keys(iconMap);
  const filteredIcons = iconSearch
    ? iconKeys.filter(k => k.toLowerCase().includes(iconSearch.toLowerCase()))
    : iconKeys;

  const loadData = async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      toast.error("Error al cargar categorías");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async () => {
    if (!newCategory.name || !newCategory.slug) {
      toast.error("Nombre y Slug son obligatorios");
      return;
    }
    if (!newCategory.icon_name && !newCategory.icon_url) {
      toast.error("Selecciona un icono o coloca una URL de icono");
      return;
    }

    try {
      await createCategory(newCategory);
      toast.success("Categoría creada");
      setIsCreateOpen(false);
      setNewCategory({ name: "", slug: "", description: "", icon_name: "", icon_url: "" });
      loadData();
    } catch (error) {
      toast.error("Error al crear categoría");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro? Esto podría afectar a productos existentes.")) return;
    
    try {
      await deleteCategory(id);
      toast.success("Categoría eliminada");
      loadData();
    } catch (error) {
      toast.error("Error al eliminar categoría");
    }
  };

  // Auto-generate slug from name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    
    setNewCategory(prev => ({ ...prev, name, slug }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Categorías</h1>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Categoría
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Categoría</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input 
                  value={newCategory.name} 
                  onChange={handleNameChange}
                  placeholder="Ej. Patines Urbanos"
                />
              </div>
              <div className="space-y-2">
                <Label>Slug (URL)</Label>
                <Input 
                  value={newCategory.slug} 
                  onChange={(e) => setNewCategory(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="ej-patines-urbanos"
                />
              </div>
              <div className="space-y-2">
                <Label>Descripción (Opcional)</Label>
                <Input 
                  value={newCategory.description} 
                  onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Icono</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar icono..."
                    className="pl-9"
                    value={iconSearch}
                    onChange={(e) => setIconSearch(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-8 gap-1 max-h-[200px] overflow-y-auto border rounded-md p-2">
                  {filteredIcons.map((name) => (
                    <button
                      key={name}
                      type="button"
                      title={name}
                      className={`h-9 w-9 rounded-md flex items-center justify-center transition-colors hover:bg-primary/20 ${newCategory.icon_name === name ? 'bg-primary text-primary-foreground ring-2 ring-primary' : 'bg-secondary/50'}`}
                      onClick={() => setNewCategory(prev => ({ ...prev, icon_name: name }))}
                    >
                      {iconMap[name]}
                    </button>
                  ))}
                  {filteredIcons.length === 0 && (
                    <p className="col-span-8 text-center text-sm text-muted-foreground py-4">No se encontraron iconos</p>
                  )}
                </div>
                {newCategory.icon_name && (
                  <p className="text-xs text-muted-foreground">Seleccionado: {newCategory.icon_name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>URL de Icono (opcional)</Label>
                <div className="flex items-center gap-3">
                  <Input
                    placeholder="https://.../icon.png"
                    value={newCategory.icon_url}
                    onChange={(e) => setNewCategory(prev => ({ ...prev, icon_url: e.target.value }))}
                  />
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
              <Button onClick={handleCreate} className="w-full">Guardar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Icono</TableHead>
              <TableHead className="w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((cat) => (
              <TableRow key={cat.id}>
                <TableCell className="font-medium">{cat.name}</TableCell>
                <TableCell className="font-mono text-xs">{cat.slug}</TableCell>
                <TableCell>{cat.description || '-'}</TableCell>
                <TableCell>
                  <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                    {cat.icon_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cat.icon_url} alt={cat.name} className="h-8 w-8 object-cover" />
                    ) : (
                      iconMap[cat.icon_name || ""] || <Package className="h-5 w-5" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
