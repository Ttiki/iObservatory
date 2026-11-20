package com.clementcombier.studio;

import java.util.*;
/** Small output-only JSON encoder, Requests use XML, so no JSON parser is needed */
final class Json {
    private Json() {}

    /** Serialises report value, maps and collections as JSON */
    static String encode(Object value){
        if(value == null) return "null";
        if (value instanceof Boolean || value instanceof Number) return value.toString();
        if(value instanceof Map<?,?> map){
            var parts = new ArrayList<String>();
            map.forEach((key,item)->parts.add(quote(key.toString())+":"+encode(item)));
            return "{" + String.join(",", parts) + "}";
        }
        if (value instanceof Collection<?> items){
            return "[" + String.join(",",items.stream().map(Json::encode).toList()) + "]";
        }
        return quote(value.toString());
    }

    /** Encodes text as a JSON string, including quotes and control characters */
    private static String quote(String value){
        var out = new StringBuilder("\"");
        for (char c : value.toCharArray()){
            switch(c){
                case '"' -> out.append("\\\"");
                case '\\' -> out.append("\\\\");
                case '\n' -> out.append("\\n");
                case '\r' -> out.append("\\r");
                case '\t' -> out.append("\\t");
                default -> {
                    if (c < 32) out.append(String.format("\\u%04x", (int) c));
                    else out.append(c);
                }
            }
        }
        return out.append('"').toString();
    }
}
